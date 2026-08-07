"use client";

import * as Popover from "@radix-ui/react-popover";
import { IconAlertTriangle } from "@tabler/icons-react";
import type { KeyboardEvent, ReactNode } from "react";
import { NUTRIENT_COLUMNS, type Ingredient, type NutritionTotals } from "@meal-pilot/core";
import { IngredientThumb } from "./IngredientThumb";
import { NutritionPopover } from "./NutritionPopover";

/*
Base compartida por todos los lugares que listan ingredientes (Inventario,
Compra, el creador de platos, el plato del día en Hoy y el catálogo de
platos): misma estructura, tamaño y espaciados (clase .ingredient-row),
miniatura a la izquierda, nombre con el mismo estilo, la misma línea de
stock (Oficina/Casa) bajo el nombre, y el mismo tooltip de valores "por
100g/ml/unidad". Lo que cambia por contexto son los slots `meta` (línea
secundaria extra bajo el nombre) y `trailing` (controles a la derecha) —
editar en Inventario, motivo+checkbox en Compra, stepper±10/quitar o botón
"+" en el creador, cantidad de la receta en Hoy/catálogo. `neededQuantity`
(solo Hoy) resalta la línea de stock en rojo si el inventario no llega.

Si el ingrediente está deshabilitado (ADR-0023), se añade un aviso junto al
de nutrición — mismo Popover al tocar, no un tooltip por hover.
*/

function per100Label(unit: Ingredient["base_unit"]): string {
  if (unit === "unit") return "Por 100 unidades";
  return `Por 100${unit}`;
}

function per100Totals(ingredient: Ingredient): NutritionTotals {
  return Object.fromEntries(
    NUTRIENT_COLUMNS.map((column) => [column, ingredient[column] ?? 0]),
  ) as NutritionTotals;
}

/** Aviso de ingrediente deshabilitado (ver ADR-0023): Popover al tocar, no tooltip por hover — el resto de la app es de uso táctil. */
function DisabledWarning({ ingredientName }: { ingredientName: string }) {
  return (
    <Popover.Root>
      <Popover.Trigger asChild>
        <button
          type="button"
          className="ingredient-warning-trigger"
          aria-label={`${ingredientName} está deshabilitado`}
        >
          <IconAlertTriangle size={18} stroke={1.75} />
        </button>
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content className="nutrition-popover" sideOffset={6} align="end">
          <p>Este ingrediente está deshabilitado para nuevos platos.</p>
          <Popover.Arrow className="nutrition-arrow" />
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}

export function IngredientRow({
  ingredient,
  meta,
  trailing,
  infoHtmlFor,
  onClick,
  neededQuantity,
  inactive,
}: {
  ingredient: Ingredient;
  meta?: ReactNode;
  trailing?: ReactNode;
  /** Si se da, el bloque nombre+meta se envuelve en un <label htmlFor=...> (Compra: tocar el nombre marca el checkbox). */
  infoHtmlFor?: string;
  /** Si se da, toda la fila actúa como botón (ej. resultado de búsqueda para añadir). */
  onClick?: () => void;
  /** Cantidad que hace falta de este ingrediente (ej. para su receta de "Hoy") — si el inventario total no llega, la línea de stock se resalta en rojo. */
  neededQuantity?: number;
  /** Atenúa la fila (ver ADR-0023): ingrediente deshabilitado en el catálogo. */
  inactive?: boolean;
}) {
  function handleKeyDown(e: KeyboardEvent<HTMLDivElement>) {
    if (!onClick) return;
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      onClick();
    }
  }

  const InfoWrapper = infoHtmlFor ? "label" : "div";
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
      <IngredientThumb ingredientId={ingredient.id} />
      <InfoWrapper
        {...(infoHtmlFor ? { htmlFor: infoHtmlFor } : {})}
        className="ingredient-row-info"
      >
        <p className="ingredient-row-name">{ingredient.name}</p>
        <p className="ingredient-row-stock" data-short={short || undefined}>
          <span>
            Oficina <strong>{ingredient.office_inventory}</strong>
            {ingredient.base_unit}
          </span>
          <span>
            Casa <strong>{ingredient.home_inventory}</strong>
            {ingredient.base_unit}
          </span>
        </p>
        {meta}
      </InfoWrapper>
      {/* stopPropagation: si la fila entera es clicable (onClick, ej. resultado
          de búsqueda), abrir el popover de nutrición no debe además disparar
          la acción de la fila (añadir el ingrediente). */}
      <span onClick={(e) => e.stopPropagation()}>
        {!ingredient.enabled && <DisabledWarning ingredientName={ingredient.name} />}
        <NutritionPopover totals={per100Totals(ingredient)} title={per100Label(ingredient.base_unit)} />
      </span>
      {trailing}
    </div>
  );
}
