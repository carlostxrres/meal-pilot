import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "./database.types.js";
import type { Dish } from "../engine/types.js";

export interface DishCatalogComponent {
  slotGroup: number;
  required: boolean;
  quantity: number;
  quantityMax: number | null;
  unit: string | null;
  ingredientName: string | null;
  categoryName: string | null;
}

export interface DishCatalogEntry {
  dish: Dish;
  components: DishCatalogComponent[];
  mealNames: string[];
}

/** Catálogo completo de dishes con sus componentes resueltos (nombres, no ids) y a qué meals están vinculadas. */
export async function fetchDishCatalog(
  supabase: SupabaseClient<Database>,
): Promise<DishCatalogEntry[]> {
  const [
    { data: dishes, error: dishesError },
    { data: dishIngredients, error: diError },
    { data: ingredients, error: ingredientsError },
    { data: categories, error: categoriesError },
    { data: mealDishes, error: mealDishesError },
    { data: meals, error: mealsError },
  ] = await Promise.all([
    supabase.from("dish").select("*"),
    supabase.from("dish_ingredient").select("*"),
    supabase.from("ingredient").select("id, name, base_unit"),
    supabase.from("ingredient_category").select("id, name"),
    supabase.from("meal_dish").select("*"),
    supabase.from("meal").select("id, name"),
  ]);
  const error =
    dishesError ?? diError ?? ingredientsError ?? categoriesError ?? mealDishesError ?? mealsError;
  if (error) throw new Error(error.message);

  const ingredientById = new Map((ingredients ?? []).map((i) => [i.id, i]));
  const categoryNameById = new Map((categories ?? []).map((c) => [c.id, c.name]));
  const mealNameById = new Map((meals ?? []).map((m) => [m.id, m.name]));

  const componentsByDish = new Map<string, DishCatalogComponent[]>();
  for (const di of dishIngredients ?? []) {
    if (!componentsByDish.has(di.dish_id)) componentsByDish.set(di.dish_id, []);
    const ingredient = di.ingredient_id ? ingredientById.get(di.ingredient_id) : undefined;
    componentsByDish.get(di.dish_id)!.push({
      slotGroup: di.slot_group,
      required: di.required,
      quantity: di.quantity,
      quantityMax: di.quantity_max,
      unit: ingredient?.base_unit ?? null,
      ingredientName: ingredient?.name ?? null,
      categoryName: di.category_id ? (categoryNameById.get(di.category_id) ?? null) : null,
    });
  }

  const mealNamesByDish = new Map<string, string[]>();
  for (const md of mealDishes ?? []) {
    if (!mealNamesByDish.has(md.dish_id)) mealNamesByDish.set(md.dish_id, []);
    const name = mealNameById.get(md.meal_id);
    if (name) mealNamesByDish.get(md.dish_id)!.push(name);
  }

  return (dishes ?? [])
    .map((dish) => ({
      dish,
      components: (componentsByDish.get(dish.id) ?? []).sort((a, b) => a.slotGroup - b.slotGroup),
      mealNames: mealNamesByDish.get(dish.id) ?? [],
    }))
    .sort((a, b) => a.dish.name.localeCompare(b.dish.name));
}
