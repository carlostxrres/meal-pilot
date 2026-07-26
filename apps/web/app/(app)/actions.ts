"use server";

import { revalidatePath } from "next/cache";
import { addToHomeInventory, setMealConfirmed, updateIngredientInventory } from "@meal-pilot/core";
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

export async function updateInventoryAction(formData: FormData) {
  const ingredientId = String(formData.get("ingredientId"));
  const office = Number(formData.get("office_inventory"));
  const home = Number(formData.get("home_inventory"));

  const supabase = await createClient();
  await updateIngredientInventory(supabase, ingredientId, {
    office_inventory: office,
    home_inventory: home,
  });
  revalidatePath("/inventory");
  revalidatePath("/shopping");
  revalidatePath("/");
}

export async function markPurchasedAction(ingredientId: string, restockQuantity: number) {
  const supabase = await createClient();
  await addToHomeInventory(supabase, ingredientId, restockQuantity);
  revalidatePath("/shopping");
  revalidatePath("/inventory");
}

export async function zeroInventoryAction(ingredientId: string) {
  const supabase = await createClient();
  await updateIngredientInventory(supabase, ingredientId, {
    office_inventory: 0,
    home_inventory: 0,
  });
  revalidatePath("/inventory");
  revalidatePath("/shopping");
  revalidatePath("/");
}
