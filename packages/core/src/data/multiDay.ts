import type { SupabaseClient } from "@supabase/supabase-js";
import { createSeededRandom } from "../engine/random.js";
import { generateDayProposal } from "../engine/resolve.js";
import type { DayProposal } from "../engine/types.js";
import { fetchDailyContext } from "./fetchDailyContext.js";
import type { Database } from "./database.types.js";

/**
 * Genera la propuesta de varios días (ej. hoy + mañana), para el selector
 * de días en "Hoy" y para calcular la lista de la compra de los próximos
 * N días en "Compra".
 *
 * Limitación conocida: cada día se genera de forma independiente (misma
 * ventana de diversidad de 3 días basada en meal_log real) — no encadena
 * la elección de un día con la del día siguiente, así que dos días
 * seguidos podrían repetir el mismo ingrediente rotable. Aceptable para
 * un horizonte corto (2-3 días); se resolvería con un solver que mire
 * varios días a la vez, fuera de alcance por ahora.
 */
export async function generateProposalsForDates(
  supabase: SupabaseClient<Database>,
  dates: readonly string[],
): Promise<DayProposal[]> {
  return Promise.all(
    dates.map(async (date) => {
      const ctx = await fetchDailyContext(supabase, date);
      return generateDayProposal(ctx, createSeededRandom(date));
    }),
  );
}

/** YYYY-MM-DD de hoy + los siguientes `days - 1` días (incluye hoy). */
export function upcomingDates(days: number, from: Date = new Date()): string[] {
  const dates: string[] = [];
  for (let i = 0; i < days; i++) {
    const d = new Date(from);
    d.setUTCDate(d.getUTCDate() + i);
    dates.push(d.toISOString().slice(0, 10));
  }
  return dates;
}
