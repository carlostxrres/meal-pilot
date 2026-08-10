"use client";

import {
  IconAlertTriangle,
  IconFridge,
  IconLeaf,
  IconMeat,
  IconMilk,
  IconPackage,
  IconSnowflake,
} from "@tabler/icons-react";
import type { KeyboardEvent, ReactNode } from "react";
import { NUTRIENT_COLUMNS, type Ingredient, type NutritionTotals } from "@meal-pilot/core";
import { formatEurPer100, formatEurPer100Sentence } from "@/lib/formatPrice";
import { IngredientThumb } from "@/components/IngredientThumb";
import { InfoChip } from "@/components/InfoChip";
import styles from "@/components/IngredientRow.module.css";
import { NutritionPopover } from "@/components/NutritionPopover";

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

const STORAGE_DESCRIPTIONS: Record<Ingredient["storage_type"], string> = {
  pantry: "Este ingrediente se debería guardar en la despensa",
  fridge: "Este ingrediente se debería guardar en la nevera",
  freezer: "Este ingrediente se debería guardar en el congelador",
};

const ANIMAL_ORIGIN_DESCRIPTIONS: Record<Ingredient["animal_origin"], string> = {
  animal: "Este ingrediente es animal",
  animal_derived: "Este ingrediente es de origen animal",
  plant: "Este ingrediente es vegetal",
};

const STORAGE_ICONS: Record<Ingredient["storage_type"], typeof IconPackage> = {
  pantry: IconPackage,
  fridge: IconFridge,
  freezer: IconSnowflake,
};

const ANIMAL_ORIGIN_ICONS: Record<Ingredient["animal_origin"], typeof IconPackage> = {
  animal: IconMeat,
  animal_derived: IconMilk,
  plant: IconLeaf,
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

  const StorageIcon = STORAGE_ICONS[ingredient.storage_type];
  const AnimalOriginIcon = ANIMAL_ORIGIN_ICONS[ingredient.animal_origin];

  const inactive = disabledWarning && !ingredient.enabled;
  const short = neededQuantity != null && ingredient.office_inventory + ingredient.home_inventory < neededQuantity;

  return (
    <div
      className={styles['ingredient-row']}
      data-clickable={onClick ? "true" : undefined}
      data-inactive={inactive || undefined}
      role={onClick ? "button" : undefined}
      tabIndex={onClick ? 0 : undefined}
      onClick={onClick}
      onKeyDown={handleKeyDown}
    >
      {inactive && (
        <p className={styles['ingredient-row-warning']}>
          <IconAlertTriangle size={16} stroke={1.75} />
          Deshabilitado para nuevos platos
        </p>
      )}
      <IngredientThumb ingredientId={ingredient.id} />
      <p className={styles['ingredient-row-name']}>{ingredient.name}</p>
      {quantity != null && <div className={styles['ingredient-row-quantity']}>{quantity}</div>}
      {menu != null && <div className={styles['ingredient-row-menu']}>{menu}</div>}
      {ingredient.description && (
        <p className={styles['ingredient-row-description']}>{ingredient.description}</p>
      )}
      <div className={styles['ingredient-row-attrs']}>
        <InfoChip
          label={STORAGE_LABELS[ingredient.storage_type]}
          icon={<StorageIcon size={16} stroke={1.75} />}
          description={STORAGE_DESCRIPTIONS[ingredient.storage_type]}
        />
        <InfoChip
          label={ANIMAL_ORIGIN_LABELS[ingredient.animal_origin]}
          icon={<AnimalOriginIcon size={16} stroke={1.75} />}
          description={ANIMAL_ORIGIN_DESCRIPTIONS[ingredient.animal_origin]}
        />
        {ingredient.price_eur_per_100 != null && (
          <InfoChip
            label={formatEurPer100(ingredient.price_eur_per_100, ingredient.base_unit)}
            description={formatEurPer100Sentence(ingredient.price_eur_per_100, ingredient.base_unit)}
          />
        )}
        {/* stopPropagation: si la fila entera es clicable (onClick, ej.
            resultado de búsqueda), abrir el popover de nutrición no debe
            además disparar la acción de la fila (añadir el ingrediente). */}
        <span onClick={(e) => e.stopPropagation()}>
          <NutritionPopover totals={per100Totals(ingredient)} title={per100Label(ingredient.base_unit)} />
        </span>
      </div>
      <p className={styles['ingredient-row-stock']} data-short={short || undefined}>
        <span>
          {ingredient.office_inventory} {ingredient.base_unit} en la oficina
        </span>
        <span>
          {ingredient.home_inventory} {ingredient.base_unit} en casa
        </span>
      </p>
      {shoppingReason != null && <div className={styles['ingredient-row-shopping-reason']}>{shoppingReason}</div>}
      {editControls != null && <div className={styles['ingredient-row-edit-controls']}>{editControls}</div>}
      {purchaseLinks != null && <div className={styles['ingredient-row-purchase-links']}>{purchaseLinks}</div>}
    </div>
  );
}
