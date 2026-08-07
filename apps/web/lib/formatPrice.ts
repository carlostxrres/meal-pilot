import type { Ingredient } from "@meal-pilot/core";

/** "2,30 €" — precio aproximado en euros, formato español. */
export function formatEur(value: number): string {
  return `${value.toLocaleString("es-ES", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €`;
}

function per100Suffix(unit: Ingredient["base_unit"]): string {
  return unit === "unit" ? "100 uds" : `100${unit}`;
}

/** "0,55 € / 100g" — precio junto a la base de cantidad sobre la que se calcula. */
export function formatEurPer100(value: number, unit: Ingredient["base_unit"]): string {
  return `${formatEur(value)} / ${per100Suffix(unit)}`;
}
