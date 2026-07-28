import type { Database } from "../data/database.types.js";

type Tables = Database["public"]["Tables"];

export type Ingredient = Tables["ingredient"]["Row"];
export type IngredientCategory = Tables["ingredient_category"]["Row"];
export type Dish = Tables["dish"]["Row"];
export type DishIngredient = Tables["dish_ingredient"]["Row"];
export type Meal = Tables["meal"]["Row"];
export type Supplement = Tables["supplement"]["Row"];
export type DietaryRequirement = Tables["dietary_requirement"]["Row"];
export type RequirementLog = Tables["requirement_log"]["Row"];
export type MealLog = Tables["meal_log"]["Row"];
export type MealTip = Tables["meal_tip"]["Row"];

export const NUTRIENT_COLUMNS = [
  "kcal_per_100",
  "protein_g_per_100",
  "carbs_g_per_100",
  "sugar_g_per_100",
  "fiber_g_per_100",
  "fat_g_per_100",
  "saturated_fat_g_per_100",
  "sodium_mg_per_100",
  "vitamin_c_mg_per_100",
  "iron_mg_per_100",
  "calcium_mg_per_100",
  "omega3_g_per_100",
] as const;

export type NutrientColumn = (typeof NUTRIENT_COLUMNS)[number];

/** Dish (siempre fija, ver ADR-0018) con sus componentes. */
export interface DishWithComponents {
  dish: Dish;
  components: DishIngredient[];
}

/** Meal con sus dishes candidatas (las que tienen `dish.meal_id` = este meal). */
export interface MealWithCandidates {
  meal: Meal;
  candidates: DishWithComponents[];
  supplements: Supplement[];
}

/** Todo lo necesario para generar la propuesta de un día concreto. */
export interface DailyContext {
  date: string; // YYYY-MM-DD
  meals: MealWithCandidates[];
  ingredientsById: Map<string, Ingredient>;
  categoriesById: Map<string, IngredientCategory>;
  /** Categorías a las que pertenece cada ingrediente (para requisitos por categoría). */
  categoryIdsByIngredientId: Map<string, Set<string>>;
  requirements: DietaryRequirement[];
  /** Último requirement_log conocido por requirement_id (puede no existir aún). */
  latestLogByRequirement: Map<string, RequirementLog>;
  /** ids de ingrediente consumidos en los últimos N días (ver diversity.ts). */
  recentlyUsedIngredientIds: Set<string>;
  /** ids de meal ya confirmados (meal_log.confirmed=true) para `date`. */
  confirmedMealIds: Set<string>;
}

/** Un ingrediente ya resuelto dentro de una dish, con la cantidad concreta a usar. */
export interface ResolvedComponent {
  ingredient: Ingredient;
  quantity: number;
}

export interface ResolvedDish {
  dish: Dish;
  components: ResolvedComponent[];
}

export interface RequirementStatus {
  requirement: DietaryRequirement;
  accumulated: number;
  effectiveMinimum: number | null;
  effectiveMaximum: number | null;
  withinRange: boolean;
}

export interface MealProposal {
  meal: Meal;
  supplements: Supplement[];
  resolved: ResolvedDish | null;
  /** Si resolved es null, motivo por el que no hubo candidata válida. */
  unresolvedReason: string | null;
}

export interface DayProposal {
  date: string;
  meals: MealProposal[];
  requirementStatuses: RequirementStatus[];
}
