import { createClient } from "@supabase/supabase-js";
import {
  createSeededRandom,
  fetchDailyContext,
  generateDayProposal,
  type DayProposal,
  type Database,
} from "@meal-pilot/core";

function parseDateArg(argv: string[]): string {
  const flagIndex = argv.indexOf("--date");
  if (flagIndex !== -1 && argv[flagIndex + 1]) {
    return argv[flagIndex + 1]!;
  }
  return new Date().toISOString().slice(0, 10);
}

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    console.error(`Falta la variable de entorno ${name} (revisa tu .env).`);
    process.exit(1);
  }
  return value;
}

function formatProposal(proposal: DayProposal): string {
  const lines: string[] = [];
  lines.push(`Propuesta del día ${proposal.date}`, "");

  for (const mealProposal of proposal.meals) {
    const { meal } = mealProposal;
    lines.push(
      `## ${meal.name} (${meal.usual_start_time.slice(0, 5)}–${meal.usual_end_time.slice(0, 5)})`,
    );

    if (!mealProposal.resolved) {
      lines.push(`  ⚠ Sin propuesta válida: ${mealProposal.unresolvedReason}`);
    } else {
      lines.push(`  ${mealProposal.resolved.dish.name}`);
      for (const component of mealProposal.resolved.components) {
        lines.push(`    - ${component.ingredient.name}: ${component.quantity}${component.ingredient.base_unit}`);
      }
    }

    for (const supplement of mealProposal.supplements) {
      lines.push(`  Suplemento: ${supplement.name} (${supplement.relative_timing})`);
    }

    lines.push("");
  }

  lines.push("## Requisitos dietéticos del día", "");
  for (const status of proposal.requirementStatuses) {
    const { requirement } = status;
    const mark = status.withinRange ? "✓" : "✗";
    const target =
      requirement.minimum != null && requirement.maximum != null
        ? `${requirement.minimum}–${requirement.maximum}`
        : (requirement.minimum ?? requirement.maximum ?? null);
    lines.push(
      `  ${mark} ${requirement.name}: ${status.accumulated.toFixed(1)} ${requirement.unit}${target != null ? ` / ${target} ${requirement.unit}` : ""}`,
    );
    if (requirement.description) lines.push(`      ${requirement.description}`);
  }

  return lines.join("\n");
}

async function main() {
  const date = parseDateArg(process.argv.slice(2));
  const url = requireEnv("SUPABASE_URL");
  const key = requireEnv("SUPABASE_SERVICE_ROLE_KEY");

  const supabase = createClient<Database>(url, key);
  const ctx = await fetchDailyContext(supabase, date);
  const rand = createSeededRandom(date);
  const proposal = generateDayProposal(ctx, rand);

  console.log(formatProposal(proposal));
}

main().catch((error: unknown) => {
  console.error("Error generando la propuesta del día:");
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
