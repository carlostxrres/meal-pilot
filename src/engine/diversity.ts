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
 * Limitación conocida: meal_log solo guarda qué dish se sirvió, no qué
 * ingrediente concreto se eligió en cada hueco flexible de esa dish (el
 * esquema no lo persiste). Por eso aquí solo se puede reconstruir con
 * certeza el aporte de los componentes fijos (`required = true`) de cada
 * dish — los huecos flexibles quedan fuera de este cálculo hasta que exista
 * un registro más detallado. Hoy además `meal_log` está vacío (nada escribe
 * ahí todavía, ver docs/status.md), así que esta función es un no-op real.
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
      if (component.required && component.ingredient_id) {
        recent.add(component.ingredient_id);
      }
    }
  }

  return recent;
}
