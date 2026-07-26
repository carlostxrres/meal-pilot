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
  ResolvedComponent,
  ResolvedDish,
} from "./types.js";

// Pesos para el ranking de prioridad (sección 5 del diseño): inventario >
// ayuda a un requisito obligatorio > diversidad. Espaciados en órdenes de
// magnitud para que la suma nunca reordene tiers (son señales 0/1).
const WEIGHT_IN_STOCK = 100;
const WEIGHT_HELPS_MANDATORY_MIN = 10;
const WEIGHT_NOT_RECENTLY_USED = 1;

function effectiveBounds(requirement: DietaryRequirement) {
  const margin = requirement.tolerance_margin;
  const effectiveMinimum =
    requirement.minimum == null ? null : requirement.minimum * (1 - margin);
  const effectiveMaximum =
    requirement.maximum == null ? null : requirement.maximum * (1 + margin);
  return { effectiveMinimum, effectiveMaximum };
}

function isRequirementApplicableToMeal(
  requirement: DietaryRequirement,
  mealId: string,
): boolean {
  return requirement.meal_id === null || requirement.meal_id === mealId;
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
  applicable: readonly DietaryRequirement[],
  runningAccumulated: ReadonlyMap<string, number>,
  categoryIdsByIngredientId: ReadonlyMap<string, Set<string>>,
): boolean {
  return applicable.some((req) => {
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
  applicable: readonly DietaryRequirement[],
  ctx: DailyContext,
  runningAccumulated: ReadonlyMap<string, number>,
): number {
  const inStock = ingredient.office_inventory + ingredient.home_inventory >= quantity;
  const helps = helpsUnmetMandatoryMinimum(
    ingredient,
    applicable,
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
 * Resuelve todos los huecos de una dish (fijos + flexibles) contra el
 * catálogo real. Devuelve null si algún hueco flexible no tiene ningún
 * ingrediente disponible en su categoría (no debería pasar con el catálogo
 * semilla, pero es una entrada externa y conviene no asumirlo).
 */
export function resolveDishSlots(
  dishWithComponents: DishWithComponents,
  applicable: readonly DietaryRequirement[],
  runningAccumulated: ReadonlyMap<string, number>,
  ctx: DailyContext,
  rand: () => number,
): ResolvedDish | null {
  const components: ResolvedComponent[] = [];

  for (const component of dishWithComponents.components) {
    if (component.ingredient_id) {
      const ingredient = ctx.ingredientsById.get(component.ingredient_id);
      if (!ingredient) return null;
      components.push({ ingredient, quantity: component.quantity });
      continue;
    }

    if (!component.category_id) return null;
    const options = ctx.ingredientsByCategory.get(component.category_id) ?? [];
    if (options.length === 0) return null;

    const chosen = pickBestByScore(
      options,
      (ingredient) =>
        scoreIngredient(ingredient, component.quantity, applicable, ctx, runningAccumulated),
      rand,
    );
    components.push({ ingredient: chosen, quantity: component.quantity });
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

function violatesMandatoryMaximum(
  resolved: ResolvedDish,
  applicable: readonly DietaryRequirement[],
  runningAccumulated: ReadonlyMap<string, number>,
  categoryIdsByIngredientId: ReadonlyMap<string, Set<string>>,
): boolean {
  return applicable.some((req) => {
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
  applicable: readonly DietaryRequirement[],
  runningAccumulated: ReadonlyMap<string, number>,
  ctx: DailyContext,
): number {
  return resolved.components.reduce(
    (sum, c) => sum + scoreIngredient(c.ingredient, c.quantity, applicable, ctx, runningAccumulated),
    0,
  );
}

function resolveMeal(
  mealCtx: MealWithCandidates,
  allRequirements: readonly DietaryRequirement[],
  runningAccumulated: Map<string, number>,
  ctx: DailyContext,
  rand: () => number,
): MealProposal {
  const applicable = allRequirements.filter((r) =>
    isRequirementApplicableToMeal(r, mealCtx.meal.id),
  );

  if (mealCtx.candidates.length === 0) {
    return {
      meal: mealCtx.meal,
      supplement: mealCtx.supplement,
      resolved: null,
      unresolvedReason: "No hay ninguna dish registrada para este meal (meal_dish vacío).",
    };
  }

  const resolvedCandidates = mealCtx.candidates
    .map((c) => resolveDishSlots(c.dish, applicable, runningAccumulated, ctx, rand))
    .filter((r): r is ResolvedDish => r !== null);

  if (resolvedCandidates.length === 0) {
    return {
      meal: mealCtx.meal,
      supplement: mealCtx.supplement,
      resolved: null,
      unresolvedReason:
        "Ninguna dish candidata pudo resolverse (algún hueco flexible sin ingredientes disponibles).",
    };
  }

  const validCandidates = resolvedCandidates.filter(
    (r) => !violatesMandatoryMaximum(r, applicable, runningAccumulated, ctx.categoryIdsByIngredientId),
  );

  if (validCandidates.length === 0) {
    return {
      meal: mealCtx.meal,
      supplement: mealCtx.supplement,
      resolved: null,
      unresolvedReason:
        "Todas las dishes candidatas violarían un requisito obligatorio (fuera de margen de tolerancia).",
    };
  }

  const chosen = pickBestByScore(
    validCandidates,
    (r) => scoreResolvedDish(r, applicable, runningAccumulated, ctx),
    rand,
  );

  for (const req of applicable) {
    const added = totalContribution(chosen, req, ctx.categoryIdsByIngredientId);
    runningAccumulated.set(req.id, (runningAccumulated.get(req.id) ?? 0) + added);
  }

  return {
    meal: mealCtx.meal,
    supplement: mealCtx.supplement,
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

/** Punto de entrada del motor: genera la propuesta completa de un día. */
export function generateDayProposal(
  ctx: DailyContext,
  rand: () => number,
): DayProposal {
  const runningAccumulated = new Map<string, number>();
  for (const [reqId, log] of ctx.latestLogByRequirement) {
    runningAccumulated.set(reqId, log.accumulated);
  }

  const meals = ctx.meals.map((mealCtx) =>
    resolveMeal(mealCtx, ctx.requirements, runningAccumulated, ctx, rand),
  );

  return {
    date: ctx.date,
    meals,
    requirementStatuses: buildRequirementStatuses(ctx.requirements, runningAccumulated),
  };
}
