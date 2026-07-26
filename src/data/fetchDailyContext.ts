import type { SupabaseClient } from "@supabase/supabase-js";
import { getRecentlyUsedIngredientIds } from "../engine/diversity.js";
import type {
  DailyContext,
  Dish,
  DishIngredient,
  DishWithComponents,
  Ingredient,
  MealWithCandidates,
  RequirementLog,
} from "../engine/types.js";
import type { Database } from "./database.types.js";

const DIVERSITY_WINDOW_DAYS = 3;

/**
 * Nota sobre owner_id: este CLI usa la service_role key (bypassa RLS) y hoy
 * solo existe un usuario real en el sistema, así que no se filtra por
 * owner_id en ninguna query. Cuando exista sesión de usuario real (fase 4,
 * vía anon key + Supabase Auth), esto debe revisarse y filtrar de verdad.
 */
export async function fetchDailyContext(
  supabase: SupabaseClient<Database>,
  date: string,
): Promise<DailyContext> {
  const [
    { data: ingredients, error: ingredientsError },
    { data: categories, error: categoriesError },
    { data: categoryLinks, error: categoryLinksError },
    { data: dishes, error: dishesError },
    { data: dishIngredients, error: dishIngredientsError },
    { data: mealsRaw, error: mealsError },
    { data: mealDishes, error: mealDishesError },
    { data: supplements, error: supplementsError },
    { data: requirements, error: requirementsError },
    { data: requirementLogs, error: requirementLogsError },
    { data: mealLogs, error: mealLogsError },
  ] = await Promise.all([
    supabase.from("ingredient").select("*"),
    supabase.from("ingredient_category").select("*"),
    supabase.from("ingredient_category_link").select("*"),
    supabase.from("dish").select("*"),
    supabase.from("dish_ingredient").select("*"),
    supabase.from("meal").select("*").order("usual_start_time"),
    supabase.from("meal_dish").select("*"),
    supabase.from("supplement").select("*"),
    supabase.from("dietary_requirement").select("*"),
    supabase.from("requirement_log").select("*").order("period_start", { ascending: false }),
    supabase.from("meal_log").select("*"),
  ]);

  for (const [name, error] of Object.entries({
    ingredientsError,
    categoriesError,
    categoryLinksError,
    dishesError,
    dishIngredientsError,
    mealsError,
    mealDishesError,
    supplementsError,
    requirementsError,
    requirementLogsError,
    mealLogsError,
  })) {
    if (error) throw new Error(`fetchDailyContext: fallo consultando ${name}: ${error.message}`);
  }

  const ingredientsById = new Map<string, Ingredient>(
    (ingredients ?? []).map((i) => [i.id, i]),
  );
  const categoriesById = new Map((categories ?? []).map((c) => [c.id, c]));

  const ingredientsByCategory = new Map<string, Ingredient[]>();
  const categoryIdsByIngredientId = new Map<string, Set<string>>();
  for (const link of categoryLinks ?? []) {
    const ingredient = ingredientsById.get(link.ingredient_id);
    if (!ingredient) continue;
    if (!ingredientsByCategory.has(link.category_id)) {
      ingredientsByCategory.set(link.category_id, []);
    }
    ingredientsByCategory.get(link.category_id)!.push(ingredient);

    if (!categoryIdsByIngredientId.has(link.ingredient_id)) {
      categoryIdsByIngredientId.set(link.ingredient_id, new Set());
    }
    categoryIdsByIngredientId.get(link.ingredient_id)!.add(link.category_id);
  }

  const dishIngredientsByDishId = new Map<string, DishIngredient[]>();
  for (const di of dishIngredients ?? []) {
    if (!dishIngredientsByDishId.has(di.dish_id)) {
      dishIngredientsByDishId.set(di.dish_id, []);
    }
    dishIngredientsByDishId.get(di.dish_id)!.push(di);
  }

  const dishesById = new Map<string, Dish>((dishes ?? []).map((d) => [d.id, d]));
  const dishWithComponents = (dishId: string): DishWithComponents | null => {
    const dish = dishesById.get(dishId);
    if (!dish) return null;
    return { dish, components: dishIngredientsByDishId.get(dishId) ?? [] };
  };

  const meals: MealWithCandidates[] = (mealsRaw ?? []).map((meal) => {
    const candidates = (mealDishes ?? [])
      .filter((md) => md.meal_id === meal.id)
      .map((md) => {
        const dish = dishWithComponents(md.dish_id);
        return dish ? { dish, quantityUnits: md.quantity_units } : null;
      })
      .filter((c): c is { dish: DishWithComponents; quantityUnits: number } => c !== null);

    const supplement = (supplements ?? []).find((s) => s.meal_id === meal.id) ?? null;

    return { meal, candidates, supplement };
  });

  const latestLogByRequirement = new Map<string, RequirementLog>();
  for (const log of requirementLogs ?? []) {
    if (date < log.period_start || date > log.period_end) continue;
    if (!latestLogByRequirement.has(log.requirement_id)) {
      latestLogByRequirement.set(log.requirement_id, log);
    }
  }

  const recentlyUsedIngredientIds = getRecentlyUsedIngredientIds(
    mealLogs ?? [],
    dishIngredientsByDishId,
    date,
    DIVERSITY_WINDOW_DAYS,
  );

  return {
    date,
    meals,
    ingredientsById,
    categoriesById,
    ingredientsByCategory,
    categoryIdsByIngredientId,
    requirements: requirements ?? [],
    latestLogByRequirement,
    recentlyUsedIngredientIds,
  };
}
