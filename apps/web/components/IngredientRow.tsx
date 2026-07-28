"use client";

import type { KeyboardEvent, ReactNode } from "react";
import { NUTRIENT_COLUMNS, type Ingredient, type NutritionTotals } from "@meal-pilot/core";
import { IngredientThumb } from "./IngredientThumb";
import { NutritionPopover } from "./NutritionPopover";

/*
Base compartida por los tres lugares que listan ingredientes (Inventario,
Compra, el creador de platos): misma estructura, tamaño y espaciados
(clase .ingredient-row), miniatura a la izquierda, nombre con el mismo
estilo, y el mismo tooltip de valores "por 100g/ml/unidad". Lo que cambia
por contexto son los slots `meta` (línea secundaria bajo el nombre) y
`trailing` (controles a la derecha) — cantidades+editar en Inventario,
motivo+checkbox en Compra, stepper±10/quitar o botón "+" en el creador.
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

export function IngredientRow({
  ingredient,
  meta,
  trailing,
  infoHtmlFor,
  onClick,
}: {
  ingredient: Ingredient;
  meta?: ReactNode;
  trailing?: ReactNode;
  /** Si se da, el bloque nombre+meta se envuelve en un <label htmlFor=...> (Compra: tocar el nombre marca el checkbox). */
  infoHtmlFor?: string;
  /** Si se da, toda la fila actúa como botón (ej. resultado de búsqueda para añadir). */
  onClick?: () => void;
}) {
  function handleKeyDown(e: KeyboardEvent<HTMLDivElement>) {
    if (!onClick) return;
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      onClick();
    }
  }

  const InfoWrapper = infoHtmlFor ? "label" : "div";

  return (
    <div
      className="ingredient-row"
      data-clickable={onClick ? "true" : undefined}
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
        {meta}
      </InfoWrapper>
      {/* stopPropagation: si la fila entera es clicable (onClick, ej. resultado
          de búsqueda), abrir el popover de nutrición no debe además disparar
          la acción de la fila (añadir el ingrediente). */}
      <span onClick={(e) => e.stopPropagation()}>
        <NutritionPopover totals={per100Totals(ingredient)} title={per100Label(ingredient.base_unit)} />
      </span>
      {trailing}
    </div>
  );
}
