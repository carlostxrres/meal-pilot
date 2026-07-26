import { computeShoppingList, fetchIngredients, generateProposalsForDates, upcomingDates } from "@meal-pilot/core";
import { createClient } from "@/lib/supabase/server";
import { PurchaseCheckbox } from "@/components/PurchaseCheckbox";

const SHOPPING_HORIZON_DAYS = 2;

const REASON_LABELS: Record<string, string> = {
  upcoming_need: `Para los próximos ${SHOPPING_HORIZON_DAYS} días`,
  requirement: "Para un requisito pendiente",
};

export default async function ShoppingPage() {
  const supabase = await createClient();
  const dates = upcomingDates(SHOPPING_HORIZON_DAYS);

  const [ingredients, proposals, { data: requirements, error }] = await Promise.all([
    fetchIngredients(supabase),
    generateProposalsForDates(supabase, dates),
    supabase.from("dietary_requirement").select("*"),
  ]);
  if (error) throw new Error(error.message);

  const items = computeShoppingList(ingredients, requirements ?? [], proposals);

  if (items.length === 0) {
    return (
      <p className="shopping-empty">
        Nada pendiente de comprar para los próximos {SHOPPING_HORIZON_DAYS} días.
      </p>
    );
  }

  return (
    <div>
      {items.map((item) => (
        <PurchaseCheckbox
          key={item.ingredient.id}
          ingredientId={item.ingredient.id}
          name={item.ingredient.name}
          reasonText={item.reasons.map((r) => REASON_LABELS[r]).join(" · ")}
          restockQuantity={item.restockQuantity}
          imageUrl={item.ingredient.image_url}
        />
      ))}
    </div>
  );
}
