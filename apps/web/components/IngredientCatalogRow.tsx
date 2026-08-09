"use client";

import { IconExternalLink, IconPencil, IconTrash } from "@tabler/icons-react";
import { useState } from "react";
import { PLANNING_HORIZON_DAYS, type IngredientCatalogEntry, type ShoppingListItem, type ShoppingReason } from "@meal-pilot/core";
import { SUPERMARKET_LABELS } from "@/lib/supermarkets";
import { IngredientCardMenu } from "./IngredientCardMenu";
import { IngredientRow } from "./IngredientRow";
import { InventoryEditDialog } from "./InventoryEditDialog";
import { SwipeableRow } from "./SwipeableRow";

export type InventoryPatch = { office_inventory: number; home_inventory: number };

const REASON_LABELS: Record<ShoppingReason, string> = {
  upcoming_need: `para los próximos ${PLANNING_HORIZON_DAYS} días`,
  requirement: "para un requisito pendiente",
};

function shoppingReasonText(item: ShoppingListItem): string {
  const reasonText = item.reasons.map((r) => REASON_LABELS[r]).join(" · ");
  return `Comprar ${item.restockQuantity}${item.ingredient.base_unit} ${reasonText}`;
}

/** Fila de un ingrediente del catálogo: mismas acciones de swipe y edición de inventario que Inventario, más el menú "..." del catálogo (editar ficha, editar inventario, habilitar/deshabilitar) y, si toca comprarlo, el motivo y cuánto comprar. */
export function IngredientCatalogRow({
  entry,
  shoppingItem,
  onUpdateInventory,
}: {
  entry: IngredientCatalogEntry;
  shoppingItem?: ShoppingListItem;
  onUpdateInventory: (ingredientId: string, values: InventoryPatch) => void;
}) {
  const { ingredient, purchaseLinks } = entry;
  const [editOpen, setEditOpen] = useState(false);

  return (
    <SwipeableRow
      leftAction={{
        label: "Vaciar",
        icon: <IconTrash size={18} stroke={1.75} />,
        onTrigger: () => onUpdateInventory(ingredient.id, { office_inventory: 0, home_inventory: 0 }),
      }}
      rightAction={{
        label: "Editar",
        icon: <IconPencil size={18} stroke={1.75} />,
        onTrigger: () => setEditOpen(true),
      }}
    >
      <IngredientRow
        ingredient={ingredient}
        disabledWarning
        menu={<IngredientCardMenu entry={entry} onEditInventory={() => setEditOpen(true)} />}
        shoppingReason={
          shoppingItem && shoppingItem.reasons.length > 0 ? (
            <p className="shopping-reason">{shoppingReasonText(shoppingItem)}</p>
          ) : undefined
        }
        purchaseLinks={
          purchaseLinks.length > 0 ? (
            <div className="dish-meal-chips">
              {purchaseLinks.map((link) => (
                <a key={link.id} href={link.url} target="_blank" rel="noreferrer" className="chip">
                  <IconExternalLink size={14} stroke={1.75} /> {SUPERMARKET_LABELS[link.supermarket]}
                </a>
              ))}
            </div>
          ) : undefined
        }
      />
      <InventoryEditDialog
        ingredient={ingredient}
        open={editOpen}
        onOpenChange={setEditOpen}
        onSave={(values) => onUpdateInventory(ingredient.id, values)}
      />
    </SwipeableRow>
  );
}
