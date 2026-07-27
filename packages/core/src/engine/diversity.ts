import type { DishIngredient, MealLog } from "./types.js";

const MS_PER_DAY = 24 * 60 * 60 * 1000;

function daysBefore(dateStr: string, days: number): string {
  const d = new Date(`${dateStr}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() - days);
  return d.toISOString().slice(0, 10);
}

/**
 * Ingredientes "usados recientemente" (norma de diversidad), a partir de
 * meal_log de los `windowDays` anteriores a `referenceDate` (sin incluirlo).
 *
 * Con dishes fijas (ADR-0018), la composición de cada dish servida determina
 * exactamente qué ingredientes se consumieron — ya no hay huecos flexibles
 * cuya elección concreta se perdiera al no persistirse.
 */
export function getRecentlyUsedIngredientIds(
  mealLogs: readonly MealLog[],
  dishIngredientsByDishId: ReadonlyMap<string, DishIngredient[]>,
  referenceDate: string,
  windowDays: number,
): Set<string> {
  const windowStart = daysBefore(referenceDate, windowDays);
  const recent = new Set<string>();

  for (const log of mealLogs) {
    if (log.date < windowStart || log.date >= referenceDate) continue;
    const components = dishIngredientsByDishId.get(log.dish_id) ?? [];
    for (const component of components) {
      recent.add(component.ingredient_id);
    }
  }

  return recent;
}
