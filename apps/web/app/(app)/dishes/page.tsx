import { fetchDishAuthoringContext, fetchDishCatalog, RequestCache } from "@meal-pilot/core";
import { createClient } from "@/lib/supabase/server";
import { DishCatalogList } from "@/components/DishCatalogList";
import { DishCreator } from "@/components/DishCreator";

export default async function DishesPage() {
  const supabase = await createClient();
  const cache = new RequestCache();
  const [dishes, authoring] = await Promise.all([
    fetchDishCatalog(supabase, cache),
    fetchDishAuthoringContext(supabase, cache),
  ]);

  return (
    <div>
      <DishCreator
        ingredients={authoring.ingredients}
        meals={authoring.meals}
        mealRequirements={authoring.mealRequirements}
        dishes={dishes}
      />
      <DishCatalogList
        dishes={dishes}
        ingredients={authoring.ingredients}
        meals={authoring.meals}
        mealRequirements={authoring.mealRequirements}
      />
    </div>
  );
}
