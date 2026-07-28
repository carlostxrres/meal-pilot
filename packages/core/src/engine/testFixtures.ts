import type {
  DailyContext,
  DietaryRequirement,
  Dish,
  DishIngredient,
  DishWithComponents,
  Ingredient,
  Meal,
  MealLog,
  MealWithCandidates,
  Supplement,
} from "./types.js";

let counter = 0;
function nextId(prefix: string): string {
  counter += 1;
  return `${prefix}-${counter}`;
}

export function makeIngredient(overrides: Partial<Ingredient> = {}): Ingredient {
  return {
    id: nextId("ing"),
    owner_id: "owner-1",
    name: "Ingrediente de prueba",
    base_unit: "g",
    storage_type: "fridge",
    opened_shelf_life_days: null,
    recommended_time: "any",
    office_inventory: 0,
    home_inventory: 0,
    kcal_per_100: null,
    protein_g_per_100: null,
    carbs_g_per_100: null,
    sugar_g_per_100: null,
    fiber_g_per_100: null,
    fat_g_per_100: null,
    saturated_fat_g_per_100: null,
    sodium_mg_per_100: null,
    vitamin_c_mg_per_100: null,
    iron_mg_per_100: null,
    calcium_mg_per_100: null,
    omega3_g_per_100: null,
    price_eur_per_100: null,
    max_quantity_per_dish: null,
    ...overrides,
  };
}

export function makeDish(overrides: Partial<Dish> = {}): Dish {
  return {
    id: nextId("dish"),
    owner_id: "owner-1",
    name: "Dish de prueba",
    dish_type: "Test",
    meal_id: "",
    description: null,
    ...overrides,
  };
}

export function makeDishIngredient(overrides: Partial<DishIngredient> = {}): DishIngredient {
  return {
    id: nextId("di"),
    dish_id: "",
    ingredient_id: "",
    quantity: 50,
    position: 0,
    ...overrides,
  };
}

/** Dish fija completa (dish + componentes) para un meal, en una llamada. */
export function makeCandidate(
  mealId: string,
  ingredients: { ingredient: Ingredient; quantity: number }[],
  dishOverrides: Partial<Dish> = {},
): DishWithComponents {
  const dish = makeDish({ meal_id: mealId, ...dishOverrides });
  return {
    dish,
    components: ingredients.map(({ ingredient, quantity }) =>
      makeDishIngredient({ dish_id: dish.id, ingredient_id: ingredient.id, quantity }),
    ),
  };
}

export function makeMeal(overrides: Partial<Meal> = {}): Meal {
  return {
    id: nextId("meal"),
    owner_id: "owner-1",
    name: "Meal de prueba",
    usual_start_time: "12:00:00",
    usual_end_time: "12:30:00",
    ...overrides,
  };
}

export function makeRequirement(overrides: Partial<DietaryRequirement> = {}): DietaryRequirement {
  return {
    id: nextId("req"),
    owner_id: "owner-1",
    name: "Requisito de prueba",
    scope_type: "ingredient",
    scope_ingredient_id: null,
    scope_category_id: null,
    scope_nutrient_column: null,
    period: "day",
    week_reset_day: null,
    meal_id: null,
    minimum: null,
    maximum: null,
    unit: "g",
    tolerance_margin: 0.1,
    strictness: "mandatory",
    description: null,
    ...overrides,
  };
}

interface BuildContextInput {
  date: string;
  ingredients: Ingredient[];
  categoryLinks?: { ingredientId: string; categoryId: string }[];
  meals: { meal: Meal; candidates: DishWithComponents[]; supplements?: Supplement[] }[];
  requirements?: DietaryRequirement[];
  mealLogs?: MealLog[];
}

/** Construye un DailyContext completo a partir de fixtures pequeños, sin pasar por Supabase. */
export function buildTestContext(input: BuildContextInput): DailyContext {
  const ingredientsById = new Map(input.ingredients.map((i) => [i.id, i]));
  const categoryIdsByIngredientId = new Map<string, Set<string>>();

  for (const link of input.categoryLinks ?? []) {
    if (!categoryIdsByIngredientId.has(link.ingredientId)) {
      categoryIdsByIngredientId.set(link.ingredientId, new Set());
    }
    categoryIdsByIngredientId.get(link.ingredientId)!.add(link.categoryId);
  }

  const meals: MealWithCandidates[] = input.meals.map((m) => ({
    meal: m.meal,
    candidates: m.candidates,
    supplements: m.supplements ?? [],
  }));

  return {
    date: input.date,
    meals,
    ingredientsById,
    categoriesById: new Map(),
    categoryIdsByIngredientId,
    requirements: input.requirements ?? [],
    latestLogByRequirement: new Map(),
    recentlyUsedIngredientIds: new Set(),
    confirmedMealIds: new Set(),
  };
}
