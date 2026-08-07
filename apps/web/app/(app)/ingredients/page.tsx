import {
  computeShoppingList,
  fetchIngredientCatalog,
  generateProposalsForDates,
  PLANNING_HORIZON_DAYS,
  upcomingDates,
  type ShoppingReason,
} from "@meal-pilot/core";
import { createClient } from "@/lib/supabase/server";
import { IngredientCatalogList } from "@/components/IngredientCatalogList";
import { IngredientCreator } from "@/components/IngredientCreator";

export default async function IngredientsPage() {
  const supabase = await createClient();
  const dates = upcomingDates(PLANNING_HORIZON_DAYS);

  const [ingredients, proposals, { data: requirements, error }] = await Promise.all([
    fetchIngredientCatalog(supabase),
    generateProposalsForDates(supabase, dates),
    supabase.from("dietary_requirement").select("*"),
  ]);
  if (error) throw new Error(error.message);

  const shoppingItems = computeShoppingList(
    ingredients.map((entry) => entry.ingredient),
    requirements ?? [],
    proposals,
  );
  const shoppingReasonsById: Record<string, ShoppingReason[]> = Object.fromEntries(
    shoppingItems.map((item) => [item.ingredient.id, item.reasons]),
  );

  return (
    <div>
      <IngredientCreator />
      <IngredientCatalogList ingredients={ingredients} shoppingReasonsById={shoppingReasonsById} />
    </div>
  );
}
