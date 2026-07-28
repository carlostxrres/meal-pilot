import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "./database.types.js";
import type { MealTip } from "../engine/types.js";

/** Todos los consejos, agrupados por meal_id (un meal puede no tener ninguno). */
export async function fetchMealTips(
  supabase: SupabaseClient<Database>,
): Promise<Map<string, MealTip[]>> {
  const { data, error } = await supabase.from("meal_tip").select("*");
  if (error) throw new Error(`fetchMealTips: ${error.message}`);

  const byMeal = new Map<string, MealTip[]>();
  for (const tip of data ?? []) {
    if (!byMeal.has(tip.meal_id)) byMeal.set(tip.meal_id, []);
    byMeal.get(tip.meal_id)!.push(tip);
  }
  return byMeal;
}
