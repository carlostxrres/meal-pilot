import { computeShoppingList, fetchIngredients } from "@comida-diaria/core";
import { createClient } from "@/lib/supabase/server";
import { PurchaseCheckbox } from "@/components/PurchaseCheckbox";

const REASON_LABELS: Record<string, string> = {
  out_of_stock: "Agotado",
  requirement: "Para un requisito",
};

export default async function ShoppingPage() {
  const supabase = await createClient();
  const [ingredients, { data: requirements, error }] = await Promise.all([
    fetchIngredients(supabase),
    supabase.from("dietary_requirement").select("*"),
  ]);
  if (error) throw new Error(error.message);

  const items = computeShoppingList(ingredients, requirements ?? []);

  if (items.length === 0) {
    return <p className="shopping-empty">Nada pendiente de comprar por ahora.</p>;
  }

  return (
    <div>
      {items.map((item) => (
        <div key={item.ingredient.id} className="shopping-row">
          <div className="shopping-info">
            <p className="shopping-name">{item.ingredient.name}</p>
            <p className="shopping-reason">
              {item.reasons.map((r) => REASON_LABELS[r]).join(" · ")}
            </p>
          </div>
          <PurchaseCheckbox ingredientId={item.ingredient.id} restockQuantity={item.restockQuantity} />
        </div>
      ))}
    </div>
  );
}
