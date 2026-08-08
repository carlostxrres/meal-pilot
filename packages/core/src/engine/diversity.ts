const MS_PER_DAY = 24 * 60 * 60 * 1000;

/** Exportado: fetchDailyContext.ts lo reutiliza para acotar la consulta de planned_meal a la misma ventana. */
export function daysBefore(dateStr: string, days: number): string {
  const d = new Date(`${dateStr}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() - days);
  return d.toISOString().slice(0, 10);
}

/**
 * Un slot (date, meal_id) ya resuelto a una lista de ingredientes, sea cual
 * sea su origen (`meal_log` confirmado con dish_id, o `planned_meal`
 * comprometido) -- vacío si ese slot no tiene ingredientes que contar
 * (unresolved, no comido, comida de fuera). Resolver el origen y tolerar
 * `dish_id`/`components` nulos es responsabilidad de quien construye esta
 * lista (`fetchDailyContext`), no de esta función.
 */
export interface RecentlyUsedSource {
  date: string;
  ingredientIds: readonly string[];
}

/**
 * Ingredientes "usados recientemente" (norma de diversidad), a partir de
 * slots ya resueltos de los `windowDays` anteriores a `referenceDate` (sin
 * incluirlo). Con dishes fijas (ADR-0018), la composición de cada dish
 * servida/comprometida determina exactamente qué ingredientes cuentan.
 *
 * ADR-0019: la diversidad se siembra tanto desde `meal_log` (lo comido) como
 * desde `planned_meal` (lo comprometido pero aún sin confirmar) -- por eso
 * esta función no sabe de esas tablas, solo de la lista ya resuelta.
 */
export function getRecentlyUsedIngredientIds(
  sources: readonly RecentlyUsedSource[],
  referenceDate: string,
  windowDays: number,
): Set<string> {
  const windowStart = daysBefore(referenceDate, windowDays);
  const recent = new Set<string>();

  for (const source of sources) {
    if (source.date < windowStart || source.date >= referenceDate) continue;
    for (const id of source.ingredientIds) recent.add(id);
  }

  return recent;
}
