"use client";

import { useRouter } from "next/navigation";
import { useOptimistic, useTransition } from "react";
import { PLANNING_HORIZON_DAYS, type Ingredient, type ShoppingListItem, type ShoppingReason } from "@meal-pilot/core";
import { markPurchasedAction } from "@/app/(app)/actions";
import { PurchaseCheckbox } from "./PurchaseCheckbox";

const REASON_LABELS: Record<ShoppingReason, string> = {
  upcoming_need: `Para los próximos ${PLANNING_HORIZON_DAYS} días`,
  requirement: "Para un requisito pendiente",
};

export function ShoppingList({ items }: { items: ShoppingListItem[] }) {
  const router = useRouter();
  const [, startTransition] = useTransition();

  // Optimista: tachar la casilla quita la fila al instante — la escritura
  // real (mover a home_inventory) y la revalidación van en segundo plano.
  const [optimisticItems, removeItem] = useOptimistic(items, (state, ingredientId: string) =>
    state.filter((item) => item.ingredient.id !== ingredientId),
  );

  function purchase(ingredient: Ingredient, quantity: number) {
    startTransition(async () => {
      removeItem(ingredient.id);
      await markPurchasedAction(ingredient.id, quantity);
      router.refresh();
    });
  }

  if (optimisticItems.length === 0) {
    return (
      <p className="shopping-empty">
        Nada pendiente de comprar para los próximos {PLANNING_HORIZON_DAYS} días.
      </p>
    );
  }

  return (
    <div>
      {optimisticItems.map((item) => (
        <PurchaseCheckbox
          key={item.ingredient.id}
          ingredient={item.ingredient}
          reasonText={item.reasons.map((r) => REASON_LABELS[r]).join(" · ")}
          restockQuantity={item.restockQuantity}
          onPurchase={purchase}
        />
      ))}
    </div>
  );
}
