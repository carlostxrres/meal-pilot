"use client";

import { IconAlertTriangle } from "@tabler/icons-react";
import type { KeyboardEvent, ReactNode } from "react";
import { NUTRIENT_COLUMNS, type Ingredient, type NutritionTotals } from "@meal-pilot/core";
import { formatEurPer100 } from "@/lib/formatPrice";
import { IngredientThumb } from "./IngredientThumb";
import { NutritionPopover } from "./NutritionPopover";

/*
Base compartida por todos los lugares que listan ingredientes (el creador de
platos, el plato del día en Hoy, el catálogo de platos y el catálogo de
Ingredientes): estructura en grid (clase .ingredient-row) con miniatura,
nombre, descripción, línea de atributos (almacenaje/origen/precio/tooltip de
nutrición) y línea de stock (Oficina/Casa) siempre presentes, calculados
aquí a partir de `ingredient`. Lo que cambia por contexto entra por props,
cada una asociada a una fila/columna fija del grid: `quantity` (Hoy/catálogo
de platos), `menu`/`shoppingReason`/`purchaseLinks` (catálogo de
Ingredientes), `editControls` (creador de platos: stepper/arrastrar/quitar,
o el +/- de una sugerencia). `neededQuantity` (solo Hoy) resalta la línea de
stock en rojo si el inventario no llega.

`disabledWarning` (solo catálogo de Ingredientes, ver ADR-0023) añade el
aviso de "deshabilitado" arriba del todo y atenúa la fila. En el resto de
contextos un ingrediente deshabilitado que ya forma parte de un plato no se
distingue visualmente — gestionar ese estado es cosa del catálogo.
*/

const STORAGE_LABELS: Record<Ingredient["storage_type"], string> = {
  pantry: "Despensa",
  fridge: "Nevera",
  freezer: "Congelador",
};

const ANIMAL_ORIGIN_LABELS: Record<Ingredient["animal_origin"], string> = {
  animal: "Animal",
  animal_derived: "Derivado animal",
  plant: "Vegetal",
};

function per100Label(unit: Ingredient["base_unit"]): string {
  if (unit === "unit") return "Por 100 unidades";
  return `Por 100${unit}`;
}

function per100Totals(ingredient: Ingredient): NutritionTotals {
  return Object.fromEntries(
    NUTRIENT_COLUMNS.map((column) => [column, ingredient[column] ?? 0]),
  ) as NutritionTotals;
}

export function IngredientRow({
  ingredient,
  disabledWarning,
  quantity,
  menu,
  editControls,
  shoppingReason,
  purchaseLinks,
  onClick,
  neededQuantity,
}: {
  ingredient: Ingredient;
  /** Aviso de deshabilitado (fila superior) + atenúa la fila — solo catálogo de Ingredientes (ver ADR-0023). */
  disabledWarning?: boolean;
  /** Cantidad de la receta, junto al nombre — Hoy/catálogo de platos. */
  quantity?: ReactNode;
  /** Menú "..." del catálogo de Ingredientes. */
  menu?: ReactNode;
  /** Controles de edición del creador de platos: arrastrar/stepper/quitar, o el +/- de una sugerencia. */
  editControls?: ReactNode;
  /** Motivo de compra — catálogo de Ingredientes. */
  shoppingReason?: ReactNode;
  /** Enlaces de compra — catálogo de Ingredientes. */
  purchaseLinks?: ReactNode;
  /** Si se da, toda la fila actúa como botón (ej. resultado de búsqueda para añadir). */
  onClick?: () => void;
  /** Cantidad que hace falta de este ingrediente (ej. para su receta de "Hoy") — si el inventario total no llega, la línea de stock se resalta en rojo. */
  neededQuantity?: number;
}) {
  function handleKeyDown(e: KeyboardEvent<HTMLDivElement>) {
    if (!onClick) return;
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      onClick();
    }
  }

  const inactive = disabledWarning && !ingredient.enabled;
  const short = neededQuantity != null && ingredient.office_inventory + ingredient.home_inventory < neededQuantity;

  return (
    <div
      className="ingredient-row"
      data-clickable={onClick ? "true" : undefined}
      data-inactive={inactive || undefined}
      role={onClick ? "button" : undefined}
      tabIndex={onClick ? 0 : undefined}
      onClick={onClick}
      onKeyDown={handleKeyDown}
    >
      {inactive && (
        <p className="ingredient-row-warning">
          <IconAlertTriangle size={16} stroke={1.75} />
          Deshabilitado para nuevos platos
        </p>
      )}
      <IngredientThumb ingredientId={ingredient.id} />
      <p className="ingredient-row-name">{ingredient.name}</p>
      {quantity != null && <div className="ingredient-row-quantity">{quantity}</div>}
      {menu != null && <div className="ingredient-row-menu">{menu}</div>}
      {ingredient.description && (
        <p className="dish-description ingredient-row-description">{ingredient.description}</p>
      )}
      <div className="ingredient-row-attrs">
        <span className="chip">{STORAGE_LABELS[ingredient.storage_type]}</span>
        <span className="chip">{ANIMAL_ORIGIN_LABELS[ingredient.animal_origin]}</span>
        {ingredient.price_eur_per_100 != null && (
          <span className="chip">{formatEurPer100(ingredient.price_eur_per_100, ingredient.base_unit)}</span>
        )}
        {/* stopPropagation: si la fila entera es clicable (onClick, ej.
            resultado de búsqueda), abrir el popover de nutrición no debe
            además disparar la acción de la fila (añadir el ingrediente). */}
        <span onClick={(e) => e.stopPropagation()}>
          <NutritionPopover totals={per100Totals(ingredient)} title={per100Label(ingredient.base_unit)} />
        </span>
      </div>
      <p className="ingredient-row-stock" data-short={short || undefined}>
        <span>
          {ingredient.office_inventory} {ingredient.base_unit} en la oficina
        </span>
        <span>
          {ingredient.home_inventory} {ingredient.base_unit} en casa
        </span>
      </p>
      {shoppingReason != null && <div className="ingredient-row-shopping-reason">{shoppingReason}</div>}
      {editControls != null && <div className="ingredient-row-edit-controls">{editControls}</div>}
      {purchaseLinks != null && <div className="ingredient-row-purchase-links">{purchaseLinks}</div>}
    </div>
  );
}
