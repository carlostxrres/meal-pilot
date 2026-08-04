import { fetchIngredientCatalog } from "@meal-pilot/core";
import { createClient } from "@/lib/supabase/server";
import { IngredientCatalogList } from "@/components/IngredientCatalogList";
import { IngredientCreator } from "@/components/IngredientCreator";

export default async function IngredientsPage() {
  const supabase = await createClient();
  const ingredients = await fetchIngredientCatalog(supabase);

  return (
    <div>
      <IngredientCreator />
      <IngredientCatalogList ingredients={ingredients} />
    </div>
  );
}
