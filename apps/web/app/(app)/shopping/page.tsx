import {
  computeShoppingList,
  fetchIngredients,
  generateProposalsForDates,
  PLANNING_HORIZON_DAYS,
  upcomingDates,
} from "@meal-pilot/core";
import { createClient } from "@/lib/supabase/server";
import { ShoppingList } from "@/components/ShoppingList";

export default async function ShoppingPage() {
  const supabase = await createClient();
  const dates = upcomingDates(PLANNING_HORIZON_DAYS);

  const [ingredients, proposals, { data: requirements, error }] = await Promise.all([
    fetchIngredients(supabase),
    generateProposalsForDates(supabase, dates),
    supabase.from("dietary_requirement").select("*"),
  ]);
  if (error) throw new Error(error.message);

  const items = computeShoppingList(ingredients, requirements ?? [], proposals);

  return <ShoppingList items={items} />;
}
