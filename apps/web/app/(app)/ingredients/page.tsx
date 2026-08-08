import {
  computeShoppingList,
  ensureCommittedPlan,
  fetchIngredientCatalog,
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

  // ADR-0019: la compra se deriva del mismo plan comprometido que "Hoy"
  // (ensureCommittedPlan), no de una generación aparte -- así las dos
  // vistas nunca pueden divergir entre sí. `ingredient`/`dietary_requirement`
  // son las mismas queries que ensureCommittedPlan dispara por dentro;
  // `cache` evita pedirlas más de una vez en esta carga.
  const [ingredients, proposals, { data: requirements, error }] = await Promise.all([
    fetchIngredientCatalog(supabase, cache),
    ensureCommittedPlan(supabase, dates, cache),
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
