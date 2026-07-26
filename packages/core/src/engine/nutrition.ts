import { NUTRIENT_COLUMNS, type NutrientColumn, type ResolvedDish } from "./types.js";

export type NutritionTotals = Record<NutrientColumn, number>;

/** Suma los valores nutricionales de una dish ya resuelta (por sus cantidades reales). */
export function computeMealNutrition(resolved: ResolvedDish): NutritionTotals {
  const totals = Object.fromEntries(NUTRIENT_COLUMNS.map((c) => [c, 0])) as NutritionTotals;

  for (const component of resolved.components) {
    for (const column of NUTRIENT_COLUMNS) {
      const perHundred = component.ingredient[column];
      if (typeof perHundred === "number") {
        totals[column] += (perHundred * component.quantity) / 100;
      }
    }
  }

  return totals;
}
