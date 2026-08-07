import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "./database.types.js";

export async function updateIngredientInventory(
  supabase: SupabaseClient<Database>,
  ingredientId: string,
  values: { office_inventory: number; home_inventory: number },
): Promise<void> {
  const { error } = await supabase
    .from("ingredient")
    .update(values)
    .eq("id", ingredientId);
  if (error) {
    throw new Error(`updateIngredientInventory: ${error.message}`);
  }
}
