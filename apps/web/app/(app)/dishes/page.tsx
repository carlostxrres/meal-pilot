import { fetchDishCatalog } from "@meal-pilot/core";
import { createClient } from "@/lib/supabase/server";
import { DishCatalogList } from "@/components/DishCatalogList";

export default async function DishesPage() {
  const supabase = await createClient();
  const dishes = await fetchDishCatalog(supabase);

  return <DishCatalogList dishes={dishes} />;
}
