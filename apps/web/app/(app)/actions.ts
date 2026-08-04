"use server";

import { revalidatePath } from "next/cache";
import {
  addToHomeInventory,
  createDish,
  createIngredient,
  setDishActive,
  setIngredientEnabled,
  setMealConfirmed,
  updateDish,
  updateIngredient,
  updateIngredientInventory,
  type DishInput,
  type IngredientInput,
} from "@meal-pilot/core";
import { createClient } from "@/lib/supabase/server";

export async function confirmMealAction(
  date: string,
  mealId: string,
  dishId: string,
  confirmed: boolean,
) {
  const supabase = await createClient();
  await setMealConfirmed(supabase, { date, mealId, dishId, confirmed });
  revalidatePath("/");
}

export async function updateInventoryAction(input: {
  ingredientId: string;
  office_inventory: number;
  home_inventory: number;
}) {
  const supabase = await createClient();
  await updateIngredientInventory(supabase, input.ingredientId, {
    office_inventory: input.office_inventory,
    home_inventory: input.home_inventory,
  });
  revalidatePath("/inventory");
  revalidatePath("/shopping");
  revalidatePath("/");
}

export async function createDishAction(
  input: DishInput,
): Promise<{ error: string | null }> {
  try {
    const supabase = await createClient();
    await createDish(supabase, input);
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Error desconocido creando el plato" };
  }
  revalidatePath("/dishes");
  revalidatePath("/");
  revalidatePath("/shopping");
  return { error: null };
}

export async function updateDishAction(
  dishId: string,
  input: DishInput,
): Promise<{ error: string | null }> {
  try {
    const supabase = await createClient();
    await updateDish(supabase, dishId, input);
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Error desconocido guardando el plato" };
  }
  revalidatePath("/dishes");
  revalidatePath("/");
  revalidatePath("/shopping");
  return { error: null };
}

export async function setDishActiveAction(dishId: string, active: boolean) {
  const supabase = await createClient();
  await setDishActive(supabase, dishId, active);
  revalidatePath("/dishes");
  revalidatePath("/");
}

/** `quantity` negativa deshace una compra (resta lo añadido) — usado por el botón "Deshacer" del toast de Compra. */
export async function markPurchasedAction(ingredientId: string, quantity: number) {
  const supabase = await createClient();
  await addToHomeInventory(supabase, ingredientId, quantity);
  revalidatePath("/shopping");
  revalidatePath("/inventory");
}

export async function createIngredientAction(
  input: IngredientInput,
): Promise<{ error: string | null }> {
  try {
    const supabase = await createClient();
    await createIngredient(supabase, input);
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Error desconocido creando el ingrediente" };
  }
  revalidatePath("/ingredients");
  revalidatePath("/dishes");
  revalidatePath("/");
  return { error: null };
}

export async function updateIngredientAction(
  ingredientId: string,
  input: IngredientInput,
): Promise<{ error: string | null }> {
  try {
    const supabase = await createClient();
    await updateIngredient(supabase, ingredientId, input);
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Error desconocido guardando el ingrediente" };
  }
  revalidatePath("/ingredients");
  revalidatePath("/dishes");
  revalidatePath("/");
  return { error: null };
}

export async function setIngredientEnabledAction(ingredientId: string, enabled: boolean) {
  const supabase = await createClient();
  await setIngredientEnabled(supabase, ingredientId, enabled);
  revalidatePath("/ingredients");
  revalidatePath("/dishes");
  revalidatePath("/");
}
