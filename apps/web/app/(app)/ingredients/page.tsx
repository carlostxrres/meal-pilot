import {
  computeShoppingList,
  fetchIngredientCatalog,
  generateProposalsForDates,
  PLANNING_HORIZON_DAYS,
  RequestCache,
  upcomingDates,
  type ShoppingReason,
} from "@meal-pilot/core";
import { createClient } from "@/lib/supabase/server";
import { IngredientCatalogList } from "@/components/IngredientCatalogList";
import { IngredientCreator } from "@/components/IngredientCreator";

export default async function IngredientsPage() {
  const supabase = await createClient();
  const dates = upcomingDates(PLANNING_HORIZON_DAYS);
  const cache = new RequestCache();

  // `ingredient` y `dietary_requirement` (sin filtrar) son las mismas queries
  // que dispara `generateProposalsForDates` por dentro (una vez por fecha del
  // horizonte) — `cache` evita pedirlas más de una vez en esta carga.
  const [ingredients, proposals, { data: requirements, error }] = await Promise.all([
    fetchIngredientCatalog(supabase, cache),
    generateProposalsForDates(supabase, dates, cache),
    cache.get("dietary_requirement:all", () => supabase.from("dietary_requirement").select("*")),
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
