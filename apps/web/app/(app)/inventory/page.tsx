import { fetchIngredients } from "@meal-pilot/core";
import { createClient } from "@/lib/supabase/server";
import { InventoryList } from "@/components/InventoryList";

export default async function InventoryPage() {
  const supabase = await createClient();
  const ingredients = await fetchIngredients(supabase);

  return <InventoryList ingredients={ingredients} />;
}
