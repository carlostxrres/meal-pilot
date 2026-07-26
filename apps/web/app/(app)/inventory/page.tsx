import { fetchIngredients } from "@comida-diaria/core";
import type { Ingredient } from "@comida-diaria/core";
import { createClient } from "@/lib/supabase/server";
import { InventoryEditDialog } from "@/components/InventoryEditDialog";

const STORAGE_LABELS: Record<Ingredient["storage_type"], string> = {
  pantry: "Despensa",
  fridge: "Nevera",
  freezer: "Congelador",
};

export default async function InventoryPage() {
  const supabase = await createClient();
  const ingredients = await fetchIngredients(supabase);

  const groups = new Map<Ingredient["storage_type"], Ingredient[]>();
  for (const ingredient of ingredients) {
    if (!groups.has(ingredient.storage_type)) groups.set(ingredient.storage_type, []);
    groups.get(ingredient.storage_type)!.push(ingredient);
  }

  return (
    <div>
      {(["pantry", "fridge", "freezer"] as const).map((storageType) => {
        const items = groups.get(storageType) ?? [];
        if (items.length === 0) return null;
        return (
          <div key={storageType}>
            <h2 className="section-title">{STORAGE_LABELS[storageType]}</h2>
            {items.map((ingredient) => (
              <div key={ingredient.id} className="inventory-row">
                <div>
                  <p className="inventory-name">{ingredient.name}</p>
                  <p className="inventory-qty">
                    <span>
                      Oficina <strong>{ingredient.office_inventory}</strong>
                      {ingredient.base_unit}
                    </span>
                    <span>
                      Casa <strong>{ingredient.home_inventory}</strong>
                      {ingredient.base_unit}
                    </span>
                  </p>
                </div>
                <InventoryEditDialog ingredient={ingredient} />
              </div>
            ))}
          </div>
        );
      })}
    </div>
  );
}
