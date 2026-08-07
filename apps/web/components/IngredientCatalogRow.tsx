"use client";

import { IconExternalLink, IconPencil, IconTrash } from "@tabler/icons-react";
import { useState } from "react";
import { PLANNING_HORIZON_DAYS, type Ingredient, type IngredientCatalogEntry, type ShoppingReason } from "@meal-pilot/core";
import { formatEurPer100 } from "@/lib/formatPrice";
import { SUPERMARKET_LABELS } from "@/lib/supermarkets";
import { IngredientCardMenu } from "./IngredientCardMenu";
import { IngredientRow } from "./IngredientRow";
import { InventoryEditDialog } from "./InventoryEditDialog";
import { SwipeableRow } from "./SwipeableRow";

export type InventoryPatch = { office_inventory: number; home_inventory: number };

const STORAGE_LABELS: Record<Ingredient["storage_type"], string> = {
  pantry: "Despensa",
  fridge: "Nevera",
  freezer: "Congelador",
};

const REASON_LABELS: Record<ShoppingReason, string> = {
  upcoming_need: `para los próximos ${PLANNING_HORIZON_DAYS} días`,
  requirement: "para un requisito pendiente",
};

function shoppingReasonText(reasons: ShoppingReason[]): string {
  return `Comprar ${reasons.map((r) => REASON_LABELS[r]).join(" · ")}`;
}

/** Fila de un ingrediente del catálogo: mismas acciones de swipe y edición de inventario que Inventario, más el menú "..." del catálogo (editar ficha, habilitar/deshabilitar) y, si toca comprarlo, el motivo. */
export function IngredientCatalogRow({
  entry,
  shoppingReasons,
  onUpdateInventory,
}: {
  entry: IngredientCatalogEntry;
  shoppingReasons?: ShoppingReason[];
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
        inactive={!ingredient.enabled}
        meta={
          <>
            {purchaseLinks.length > 0 && (
              <div className="dish-meal-chips">
                {purchaseLinks.map((link) => (
                  <a key={link.id} href={link.url} target="_blank" rel="noreferrer" className="chip">
                    <IconExternalLink size={14} stroke={1.75} /> {SUPERMARKET_LABELS[link.supermarket]}
                  </a>
                ))}
              </div>
            )}
            {shoppingReasons && shoppingReasons.length > 0 && (
              <p className="shopping-reason">{shoppingReasonText(shoppingReasons)}</p>
            )}
          </>
        }
        trailing={
          <div className="ingredient-row-trailing">
            <span className="dish-status-badge" data-status={ingredient.enabled ? "active" : "inactive"}>
              {ingredient.enabled ? "Habilitado" : "Deshabilitado"}
            </span>
            <span className="dish-type-label">{STORAGE_LABELS[ingredient.storage_type]}</span>
            {ingredient.price_eur_per_100 != null && (
              <span className="dish-price">
                {formatEurPer100(ingredient.price_eur_per_100, ingredient.base_unit)}
              </span>
            )}
            <button
              type="button"
              className="inventory-edit-btn"
              aria-label={`Editar ${ingredient.name}`}
              onClick={() => setEditOpen(true)}
            >
              <IconPencil size={16} stroke={1.75} />
            </button>
            <InventoryEditDialog
              ingredient={ingredient}
              open={editOpen}
              onOpenChange={setEditOpen}
              onSave={(values) => onUpdateInventory(ingredient.id, values)}
            />
            <IngredientCardMenu entry={entry} />
          </div>
        }
      />
    </SwipeableRow>
  );
}
