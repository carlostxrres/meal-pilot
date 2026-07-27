import type { SupabaseClient } from "@supabase/supabase-js";
import { getRecentlyUsedIngredientIds } from "../engine/diversity.js";
import type {
  DailyContext,
  DishIngredient,
  DishWithComponents,
  Ingredient,
  MealWithCandidates,
  RequirementLog,
} from "../engine/types.js";
import type { Database } from "./database.types.js";

const DIVERSITY_WINDOW_DAYS = 3;

/**
 * Nota sobre owner_id: nunca se filtra explícitamente por owner_id en
 * ninguna query. Hay dos consumidores con dos modelos de acceso distintos:
 * - `apps/cli` usa la service_role key (bypassa RLS); como hoy solo existe
 *   un usuario en todo el sistema, el efecto es el mismo que filtrar por él.
 * - `apps/web` (fase 4) pasa el cliente autenticado del usuario (anon key +
 *   sesión real vía Supabase Auth); ahí el filtrado lo hace RLS de forma
 *   automática (`owner_id = auth.uid()`, ver supabase/migrations/... y
 *   docs/adrs/0005-*.md), así que tampoco hace falta añadirlo aquí.
 * Si en el futuro hay más de un usuario, esto sigue siendo correcto para
 * `apps/web` (cada sesión ve solo lo suyo), pero `apps/cli` pasaría a
 * necesitar un owner_id explícito en vez de asumir "el único que hay".
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

  const categoryIdsByIngredientId = new Map<string, Set<string>>();
  for (const link of categoryLinks ?? []) {
    if (!ingredientsById.has(link.ingredient_id)) continue;
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

  const meals: MealWithCandidates[] = (mealsRaw ?? []).map((meal) => {
    const candidates: DishWithComponents[] = (dishes ?? [])
      .filter((dish) => dish.meal_id === meal.id)
      .map((dish) => ({ dish, components: dishIngredientsByDishId.get(dish.id) ?? [] }));

    const mealSupplements = (supplements ?? []).filter((s) => s.meal_id === meal.id);

    return { meal, candidates, supplements: mealSupplements };
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

  const confirmedMealIds = new Set<string>(
    (mealLogs ?? []).filter((log) => log.date === date && log.confirmed).map((log) => log.meal_id),
  );

  return {
    date,
    meals,
    ingredientsById,
    categoriesById,
    categoryIdsByIngredientId,
    requirements: requirements ?? [],
    latestLogByRequirement,
    recentlyUsedIngredientIds,
    confirmedMealIds,
  };
}
