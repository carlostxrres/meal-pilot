import type { SupabaseClient } from "@supabase/supabase-js";
import type { Ingredient } from "../engine/types.js";
import type { Database } from "./database.types.js";

export async function fetchIngredients(
  supabase: SupabaseClient<Database>,
): Promise<Ingredient[]> {
  const { data, error } = await supabase
    .from("ingredient")
    .select("*")
    .order("storage_type")
    .order("name");
  if (error) {
    throw new Error(`fetchIngredients: ${error.message}`);
  }
  return data ?? [];
}

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

/** Suma `amount` al home_inventory actual de un ingrediente (reponer tras comprar). */
export async function addToHomeInventory(
  supabase: SupabaseClient<Database>,
  ingredientId: string,
  amount: number,
): Promise<void> {
  const { data, error: fetchError } = await supabase
    .from("ingredient")
    .select("home_inventory")
    .eq("id", ingredientId)
    .single();
  if (fetchError || !data) {
    throw new Error(`addToHomeInventory: no se pudo leer el ingrediente: ${fetchError?.message}`);
  }

  const { error } = await supabase
    .from("ingredient")
    .update({ home_inventory: data.home_inventory + amount })
    .eq("id", ingredientId);
  if (error) {
    throw new Error(`addToHomeInventory: ${error.message}`);
  }
}
