"use server";

import { revalidatePath } from "next/cache";
import {
  addToHomeInventory,
  createDish,
  setDishActive,
  setMealConfirmed,
  updateDish,
  updateIngredientInventory,
  type DishInput,
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

export async function markPurchasedAction(ingredientId: string, restockQuantity: number) {
  const supabase = await createClient();
  await addToHomeInventory(supabase, ingredientId, restockQuantity);
  revalidatePath("/shopping");
  revalidatePath("/inventory");
}
