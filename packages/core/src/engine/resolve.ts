import { pickRandom } from "./random.js";
import type {
  DailyContext,
  DayProposal,
  DietaryRequirement,
  DishWithComponents,
  Ingredient,
  MealProposal,
  MealWithCandidates,
  RequirementStatus,
  ResolvedDish,
} from "./types.js";

// Pesos para el ranking de prioridad (sección 5 del diseño): inventario >
// ayuda a un requisito obligatorio > diversidad. Espaciados en órdenes de
// magnitud para que la suma nunca reordene tiers (son señales 0/1).
const WEIGHT_IN_STOCK = 100;
const WEIGHT_HELPS_MANDATORY_MIN = 10;
const WEIGHT_NOT_RECENTLY_USED = 1;

export function effectiveBounds(requirement: DietaryRequirement) {
  const margin = requirement.tolerance_margin;
  const effectiveMinimum =
    requirement.minimum == null ? null : requirement.minimum * (1 - margin);
  const effectiveMaximum =
    requirement.maximum == null ? null : requirement.maximum * (1 + margin);
  return { effectiveMinimum, effectiveMaximum };
}

function ingredientMatchesRequirementScope(
  ingredient: Ingredient,
  requirement: DietaryRequirement,
  categoryIdsByIngredientId: ReadonlyMap<string, Set<string>>,
): boolean {
  switch (requirement.scope_type) {
    case "ingredient":
      return ingredient.id === requirement.scope_ingredient_id;
    case "ingredient_category": {
      const cats = categoryIdsByIngredientId.get(ingredient.id);
      return (
        !!requirement.scope_category_id &&
        !!cats?.has(requirement.scope_category_id)
      );
    }
    case "nutrient": {
      const col = requirement.scope_nutrient_column as keyof Ingredient | null;
      if (!col) return false;
      const value = ingredient[col];
      return typeof value === "number" && value > 0;
    }
    default:
      return false;
  }
}

/** Cuánto aporta un ingrediente (con una cantidad concreta) a un requisito. */
function contribution(
  ingredient: Ingredient,
  quantity: number,
  requirement: DietaryRequirement,
  categoryIdsByIngredientId: ReadonlyMap<string, Set<string>>,
): number {
  if (requirement.scope_type === "nutrient") {
    const col = requirement.scope_nutrient_column as keyof Ingredient | null;
    if (!col) return 0;
    const perHundred = ingredient[col];
    return typeof perHundred === "number" ? (perHundred * quantity) / 100 : 0;
  }
  return ingredientMatchesRequirementScope(
    ingredient,
    requirement,
    categoryIdsByIngredientId,
  )
    ? quantity
    : 0;
}

function helpsUnmetMandatoryMinimum(
  ingredient: Ingredient,
  globalRequirements: readonly DietaryRequirement[],
  runningAccumulated: ReadonlyMap<string, number>,
  categoryIdsByIngredientId: ReadonlyMap<string, Set<string>>,
): boolean {
  return globalRequirements.some((req) => {
    if (req.strictness !== "mandatory" || req.minimum == null) return false;
    const { effectiveMinimum } = effectiveBounds(req);
    if (effectiveMinimum == null) return false;
    const current = runningAccumulated.get(req.id) ?? 0;
    if (current >= effectiveMinimum) return false;
    return ingredientMatchesRequirementScope(
      ingredient,
      req,
      categoryIdsByIngredientId,
    );
  });
}

function scoreIngredient(
  ingredient: Ingredient,
  quantity: number,
  globalRequirements: readonly DietaryRequirement[],
  ctx: DailyContext,
  runningAccumulated: ReadonlyMap<string, number>,
): number {
  const inStock = ingredient.office_inventory + ingredient.home_inventory >= quantity;
  const helps = helpsUnmetMandatoryMinimum(
    ingredient,
    globalRequirements,
    runningAccumulated,
    ctx.categoryIdsByIngredientId,
  );
  const fresh = !ctx.recentlyUsedIngredientIds.has(ingredient.id);
  return (
    (inStock ? WEIGHT_IN_STOCK : 0) +
    (helps ? WEIGHT_HELPS_MANDATORY_MIN : 0) +
    (fresh ? WEIGHT_NOT_RECENTLY_USED : 0)
  );
}

function pickBestByScore<T>(
  items: readonly T[],
  scoreOf: (item: T) => number,
  rand: () => number,
): T {
  let bestScore = -Infinity;
  for (const item of items) bestScore = Math.max(bestScore, scoreOf(item));
  const best = items.filter((item) => scoreOf(item) === bestScore);
  return pickRandom(best, rand);
}

/**
 * Materializa una dish fija (ADR-0018): cada componente es un ingrediente
 * concreto con su cantidad. Devuelve null si algún ingrediente referenciado
 * no existe en el catálogo (entrada externa, conviene no asumirlo).
 */
export function toResolvedDish(
  dishWithComponents: DishWithComponents,
  ctx: DailyContext,
): ResolvedDish | null {
  const components = [];
  for (const component of dishWithComponents.components) {
    const ingredient = ctx.ingredientsById.get(component.ingredient_id);
    if (!ingredient) return null;
    components.push({ ingredient, quantity: component.quantity });
  }
  return { dish: dishWithComponents.dish, components };
}

function totalContribution(
  resolved: ResolvedDish,
  requirement: DietaryRequirement,
  categoryIdsByIngredientId: ReadonlyMap<string, Set<string>>,
): number {
  return resolved.components.reduce(
    (sum, c) =>
      sum + contribution(c.ingredient, c.quantity, requirement, categoryIdsByIngredientId),
    0,
  );
}

/**
 * Filtro duro de generación: solo los requisitos globales (meal_id = null)
 * mandatory con techo — ej. el máximo semanal de atún. Las ventanas
 * nutricionales del propio meal (meal_id != null, ADR-0017) no se filtran
 * aquí: las dishes fijas las cumplen por construcción (se validan al
 * crearlas, ver compliance.ts), no en generación.
 */
function violatesMandatoryMaximum(
  resolved: ResolvedDish,
  globalRequirements: readonly DietaryRequirement[],
  runningAccumulated: ReadonlyMap<string, number>,
  categoryIdsByIngredientId: ReadonlyMap<string, Set<string>>,
): boolean {
  return globalRequirements.some((req) => {
    if (req.strictness !== "mandatory" || req.maximum == null) return false;
    const { effectiveMaximum } = effectiveBounds(req);
    if (effectiveMaximum == null) return false;
    const current = runningAccumulated.get(req.id) ?? 0;
    const added = totalContribution(resolved, req, categoryIdsByIngredientId);
    return current + added > effectiveMaximum;
  });
}

function scoreResolvedDish(
  resolved: ResolvedDish,
  globalRequirements: readonly DietaryRequirement[],
  runningAccumulated: ReadonlyMap<string, number>,
  ctx: DailyContext,
): number {
  // Media, no suma: si sumaramos, una dish con mas componentes ganaria casi
  // siempre solo por tener mas componentes que puntuan (WEIGHT_IN_STOCK etc.),
  // independientemente de si es realmente la mejor opcion para el meal.
  const total = resolved.components.reduce(
    (sum, c) => sum + scoreIngredient(c.ingredient, c.quantity, globalRequirements, ctx, runningAccumulated),
    0,
  );
  return total / resolved.components.length;
}

function resolveMeal(
  mealCtx: MealWithCandidates,
  allRequirements: readonly DietaryRequirement[],
  runningAccumulated: Map<string, number>,
  ctx: DailyContext,
  rand: () => number,
): MealProposal {
  const globalRequirements = allRequirements.filter((r) => r.meal_id === null);

  if (mealCtx.candidates.length === 0) {
    return {
      meal: mealCtx.meal,
      supplements: mealCtx.supplements,
      resolved: null,
      unresolvedReason: "No hay ninguna dish registrada para este meal (dish.meal_id).",
    };
  }

  const resolvedCandidates = mealCtx.candidates
    .map((c) => toResolvedDish(c, ctx))
    .filter((r): r is ResolvedDish => r !== null);

  if (resolvedCandidates.length === 0) {
    return {
      meal: mealCtx.meal,
      supplements: mealCtx.supplements,
      resolved: null,
      unresolvedReason:
        "Ninguna dish candidata pudo materializarse (algún ingrediente referenciado no existe).",
    };
  }

  const validCandidates = resolvedCandidates.filter(
    (r) => !violatesMandatoryMaximum(r, globalRequirements, runningAccumulated, ctx.categoryIdsByIngredientId),
  );

  if (validCandidates.length === 0) {
    return {
      meal: mealCtx.meal,
      supplements: mealCtx.supplements,
      resolved: null,
      unresolvedReason:
        "Todas las dishes candidatas violarían un requisito obligatorio (fuera de margen de tolerancia).",
    };
  }

  const chosen = pickBestByScore(
    validCandidates,
    (r) => scoreResolvedDish(r, globalRequirements, runningAccumulated, ctx),
    rand,
  );

  // El acumulado sí incluye los requisitos del propio meal (ADR-0017): su
  // status del día es exactamente el aporte de la dish elegida para ese meal.
  for (const req of allRequirements) {
    if (req.meal_id !== null && req.meal_id !== mealCtx.meal.id) continue;
    const added = totalContribution(chosen, req, ctx.categoryIdsByIngredientId);
    runningAccumulated.set(req.id, (runningAccumulated.get(req.id) ?? 0) + added);
  }

  return {
    meal: mealCtx.meal,
    supplements: mealCtx.supplements,
    resolved: chosen,
    unresolvedReason: null,
  };
}

function buildRequirementStatuses(
  requirements: readonly DietaryRequirement[],
  runningAccumulated: ReadonlyMap<string, number>,
): RequirementStatus[] {
  return requirements.map((requirement) => {
    const accumulated = runningAccumulated.get(requirement.id) ?? 0;
    const { effectiveMinimum, effectiveMaximum } = effectiveBounds(requirement);
    const withinRange =
      (effectiveMinimum == null || accumulated >= effectiveMinimum) &&
      (effectiveMaximum == null || accumulated <= effectiveMaximum);
    return { requirement, accumulated, effectiveMinimum, effectiveMaximum, withinRange };
  });
}

const WEEKDAY_INDEX: Record<string, number> = {
  sun: 0,
  mon: 1,
  tue: 2,
  wed: 3,
  thu: 4,
  fri: 5,
  sat: 6,
};

/** Fecha (YYYY-MM-DD) de inicio de la ventana semanal de `date`, dado el día de reset. */
function weekPeriodStart(date: string, resetDay: string): string {
  const d = new Date(`${date}T00:00:00Z`);
  const diff = (d.getUTCDay() - (WEEKDAY_INDEX[resetDay] ?? 1) + 7) % 7;
  d.setUTCDate(d.getUTCDate() - diff);
  return d.toISOString().slice(0, 10);
}

/**
 * Genera la propuesta de varios días **encadenados**: la diversidad y el
 * acumulado de los requisitos semanales se arrastran de un día al
 * siguiente dentro de la ventana (no cada día parte de cero), para que el
 * sistema pueda repartir a lo largo de la semana requisitos escasos (ej.
 * sardinas 2x/semana) y evitar repetir ingredientes rotables entre días
 * consecutivos del plan.
 *
 * Reglas de arrastre entre día N y N+1:
 *   - `period = day`: se reinicia cada día (empieza de 0, o del valor real
 *     de `requirement_log` para ese día si existiera).
 *   - `period = week`: se mantiene mientras las dos fechas caigan en la
 *     misma ventana semanal (según `week_reset_day`); si el plan cruza un
 *     reset de semana, también se reinicia.
 *   - Diversidad: los ingredientes usados en el día N se añaden al conjunto
 *     de "usados recientemente" antes de resolver el día N+1.
 *
 * Limitación conocida: sigue siendo un algoritmo voraz día a día (usa la
 * prioridad de "ayuda a un requisito no cumplido" al puntuar cada dish),
 * no un solver que mire todos los días a la vez para encontrar el reparto
 * óptimo — pero ya no genera cada día de forma aislada.
 */
export function generateMultiDayPlan(
  contexts: readonly DailyContext[],
  rand: () => number,
): DayProposal[] {
  if (contexts.length === 0) return [];

  const requirements = contexts[0]!.requirements;
  const runningAccumulated = new Map<string, number>();
  for (const [reqId, log] of contexts[0]!.latestLogByRequirement) {
    runningAccumulated.set(reqId, log.accumulated);
  }
  const recentlyUsed = new Set(contexts[0]!.recentlyUsedIngredientIds);

  const results: DayProposal[] = [];

  contexts.forEach((ctx, dayIndex) => {
    if (dayIndex > 0) {
      const previousDate = contexts[dayIndex - 1]!.date;
      for (const req of requirements) {
        if (req.period === "day") {
          runningAccumulated.set(req.id, ctx.latestLogByRequirement.get(req.id)?.accumulated ?? 0);
        } else if (req.period === "week" && req.week_reset_day) {
          const samePeriod =
            weekPeriodStart(previousDate, req.week_reset_day) === weekPeriodStart(ctx.date, req.week_reset_day);
          if (!samePeriod) {
            runningAccumulated.set(req.id, ctx.latestLogByRequirement.get(req.id)?.accumulated ?? 0);
          }
        }
      }
      for (const id of ctx.recentlyUsedIngredientIds) recentlyUsed.add(id);
    }

    const effectiveCtx: DailyContext = { ...ctx, recentlyUsedIngredientIds: recentlyUsed };
    const meals = ctx.meals.map((mealCtx) =>
      resolveMeal(mealCtx, requirements, runningAccumulated, effectiveCtx, rand),
    );

    for (const mealProposal of meals) {
      if (!mealProposal.resolved) continue;
      for (const component of mealProposal.resolved.components) {
        recentlyUsed.add(component.ingredient.id);
      }
    }

    results.push({
      date: ctx.date,
      meals,
      requirementStatuses: buildRequirementStatuses(requirements, runningAccumulated),
    });
  });

  return results;
}

/** Punto de entrada del motor para un único día (caso particular de un plan de 1 día). */
export function generateDayProposal(
  ctx: DailyContext,
  rand: () => number,
): DayProposal {
  return generateMultiDayPlan([ctx], rand)[0]!;
}
