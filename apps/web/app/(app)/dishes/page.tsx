import { fetchDishAuthoringContext, fetchDishCatalog } from "@meal-pilot/core";
import { createClient } from "@/lib/supabase/server";
import { DishCatalogList } from "@/components/DishCatalogList";
import { DishCreator } from "@/components/DishCreator";

export default async function DishesPage() {
  const supabase = await createClient();
  const [dishes, authoring] = await Promise.all([
    fetchDishCatalog(supabase),
    fetchDishAuthoringContext(supabase),
  ]);

  return (
    <div>
      <DishCreator
        ingredients={authoring.ingredients}
        meals={authoring.meals}
        mealRequirements={authoring.mealRequirements}
      />
      <DishCatalogList dishes={dishes} />
    </div>
  );
}
