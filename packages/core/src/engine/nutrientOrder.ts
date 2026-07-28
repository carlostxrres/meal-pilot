import type { DietaryRequirement } from "./types.js";

/**
 * Orden de lectura estilo etiqueta nutricional europea para las ventanas por
 * meal (ADR-0017): macros en el orden habitual, con "de las cuales
 * saturadas" / "de los cuales azúcares" justo debajo de su nutriente padre
 * (ver migración 20260728100000 y el indent en CapsuleMeter). Necesario
 * porque las consultas a `dietary_requirement` no llevan `ORDER BY` —sin
 * esto, la adyacencia visual padre/sub-fila dependería del orden que
 * devuelva Postgres, que no está garantizado.
 */
const NUTRIENT_DISPLAY_ORDER: readonly string[] = [
  "kcal_per_100",
  "fat_g_per_100",
  "saturated_fat_g_per_100",
  "carbs_g_per_100",
  "sugar_g_per_100",
  "fiber_g_per_100",
  "protein_g_per_100",
  "sodium_mg_per_100",
];

function orderIndex(column: string | null): number {
  if (!column) return NUTRIENT_DISPLAY_ORDER.length;
  const i = NUTRIENT_DISPLAY_ORDER.indexOf(column);
  return i === -1 ? NUTRIENT_DISPLAY_ORDER.length : i;
}

/** Columnas fuera de la lista (u otros scope_type) se quedan al final, estables en su orden original. */
export function sortByNutrientDisplayOrder<T extends { requirement: DietaryRequirement }>(
  statuses: readonly T[],
): T[] {
  return [...statuses].sort(
    (a, b) => orderIndex(a.requirement.scope_nutrient_column) - orderIndex(b.requirement.scope_nutrient_column),
  );
}
