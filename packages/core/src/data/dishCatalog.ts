import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "./database.types.js";
import { checkDishCompliance, type DishCompliance } from "../engine/compliance.js";
import { computeDishPrice } from "../engine/price.js";
import type { Dish, Ingredient, ResolvedComponent } from "../engine/types.js";

export interface DishCatalogEntry {
  dish: Dish;
  components: ResolvedComponent[];
  /** Nombre del meal al que pertenece la dish (dish.meal_id, ADR-0018). */
  mealName: string | null;
  /** Perfil de la dish contra la ventana nutricional de su meal (ADR-0017). */
  compliance: DishCompliance;
  /** Precio aproximado (EUR), suma de sus componentes — ver engine/price.ts. */
  price: number;
}

/** Catálogo completo de dishes con componentes, meal, cumplimiento de su ventana nutricional y precio. */
export async function fetchDishCatalog(
  supabase: SupabaseClient<Database>,
): Promise<DishCatalogEntry[]> {
  const [
    { data: dishes, error: dishesError },
    { data: dishIngredients, error: diError },
    { data: ingredients, error: ingredientsError },
    { data: meals, error: mealsError },
    { data: requirements, error: requirementsError },
  ] = await Promise.all([
    supabase.from("dish").select("*"),
    supabase.from("dish_ingredient").select("*").order("position"),
    supabase.from("ingredient").select("*"),
    supabase.from("meal").select("id, name"),
    supabase.from("dietary_requirement").select("*").not("meal_id", "is", null),
  ]);
  const error = dishesError ?? diError ?? ingredientsError ?? mealsError ?? requirementsError;
  if (error) throw new Error(error.message);

  const ingredientById = new Map<string, Ingredient>((ingredients ?? []).map((i) => [i.id, i]));
  const mealNameById = new Map((meals ?? []).map((m) => [m.id, m.name]));

  const componentsByDish = new Map<string, ResolvedComponent[]>();
  for (const di of dishIngredients ?? []) {
    const ingredient = ingredientById.get(di.ingredient_id);
    if (!ingredient) continue;
    if (!componentsByDish.has(di.dish_id)) componentsByDish.set(di.dish_id, []);
    componentsByDish.get(di.dish_id)!.push({ ingredient, quantity: di.quantity });
  }

  return (dishes ?? [])
    .map((dish) => {
      const components = componentsByDish.get(dish.id) ?? [];
      return {
        dish,
        components,
        mealName: mealNameById.get(dish.meal_id) ?? null,
        compliance: checkDishCompliance({ dish, components }, requirements ?? []),
        price: computeDishPrice({ components }),
      };
    })
    .sort((a, b) => a.dish.name.localeCompare(b.dish.name));
}
