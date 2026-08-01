"use client";

import * as Toast from "@radix-ui/react-toast";
import { useRouter } from "next/navigation";
import { useOptimistic, useState, useTransition } from "react";
import { PLANNING_HORIZON_DAYS, type Ingredient, type ShoppingListItem, type ShoppingReason } from "@meal-pilot/core";
import { markPurchasedAction } from "@/app/(app)/actions";
import { PurchaseCheckbox } from "./PurchaseCheckbox";

const REASON_LABELS: Record<ShoppingReason, string> = {
  upcoming_need: `Para los próximos ${PLANNING_HORIZON_DAYS} días`,
  requirement: "Para un requisito pendiente",
};

function formatQuantity(value: number): string {
  return (Math.round(value * 10) / 10).toString();
}

function formatPurchaseAmount(quantity: number, unit: Ingredient["base_unit"]): string {
  const amount = formatQuantity(quantity);
  if (unit === "unit") return `${amount} ${amount === "1" ? "unidad" : "unidades"}`;
  return `${amount}${unit}`;
}

interface LastPurchase {
  ingredientId: string;
  ingredientName: string;
  quantity: number;
  unit: Ingredient["base_unit"];
}

export function ShoppingList({ items }: { items: ShoppingListItem[] }) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [lastPurchase, setLastPurchase] = useState<LastPurchase | null>(null);
  const [toastOpen, setToastOpen] = useState(false);

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
    setLastPurchase({
      ingredientId: ingredient.id,
      ingredientName: ingredient.name,
      quantity,
      unit: ingredient.base_unit,
    });
    setToastOpen(true);
  }

  // Deshacer: resta la misma cantidad que se acaba de sumar (ver
  // markPurchasedAction) — el ingrediente vuelve a aparecer en la lista tras
  // la revalidación, sin necesidad de reinsertarlo a mano en el estado optimista.
  function undoPurchase() {
    if (!lastPurchase) return;
    const { ingredientId, quantity } = lastPurchase;
    startTransition(async () => {
      await markPurchasedAction(ingredientId, -quantity);
      router.refresh();
    });
    setToastOpen(false);
  }

  return (
    <Toast.Provider swipeDirection="right" duration={8000}>
      {optimisticItems.length === 0 ? (
        <p className="shopping-empty">
          Nada pendiente de comprar para los próximos {PLANNING_HORIZON_DAYS} días.
        </p>
      ) : (
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
      )}

      {lastPurchase && (
        <Toast.Root className="purchase-toast" open={toastOpen} onOpenChange={setToastOpen}>
          <Toast.Description className="purchase-toast-text">
            Compraste {formatPurchaseAmount(lastPurchase.quantity, lastPurchase.unit)} de{" "}
            {lastPurchase.ingredientName}
          </Toast.Description>
          <Toast.Action className="purchase-toast-undo" altText="Deshacer la compra" onClick={undoPurchase} asChild>
            <button type="button">Deshacer</button>
          </Toast.Action>
        </Toast.Root>
      )}
      <Toast.Viewport className="purchase-toast-viewport" />
    </Toast.Provider>
  );
}
