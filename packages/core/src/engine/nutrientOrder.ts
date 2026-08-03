import type { DietaryRequirement, NutrientColumn } from "./types.js";

/**
 * Orden de lectura estilo etiqueta nutricional europea (ADR-0017): macros en
 * el orden habitual, con "de las cuales saturadas" / "de los cuales
 * azúcares" justo debajo de su nutriente padre (ver migración 20260728100000
 * y el indent en CapsuleMeter), seguidos de los micronutrientes que no
 * forman parte de ninguna ventana por meal. Fuente única de este orden: lo
 * usan tanto las ventanas por meal (`sortByNutrientDisplayOrder`, sobre
 * `dietary_requirement`, cuyas consultas no llevan `ORDER BY`) como el
 * detalle nutricional de un ingrediente suelto (`sortColumnsByDisplayOrder`,
 * ver NutritionPopover) — así ambos listan los nutrientes en el mismo orden
 * sin duplicar el criterio.
 */
export const NUTRIENT_DISPLAY_ORDER: readonly NutrientColumn[] = [
  "kcal_per_100",
  "fat_g_per_100",
  "saturated_fat_g_per_100",
  "carbs_g_per_100",
  "sugar_g_per_100",
  "fiber_g_per_100",
  "protein_g_per_100",
  "sodium_mg_per_100",
  "vitamin_c_mg_per_100",
  "iron_mg_per_100",
  "calcium_mg_per_100",
  "omega3_g_per_100",
];

function orderIndex(column: string | null): number {
  if (!column) return NUTRIENT_DISPLAY_ORDER.length;
  const i = NUTRIENT_DISPLAY_ORDER.indexOf(column as NutrientColumn);
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

/** Igual que `sortByNutrientDisplayOrder`, pero para listas que no vienen envueltas en un `RequirementStatus` (ej. las 12 columnas de un `Ingredient`). */
export function sortColumnsByDisplayOrder<T>(items: readonly T[], columnOf: (item: T) => string | null): T[] {
  return [...items].sort((a, b) => orderIndex(columnOf(a)) - orderIndex(columnOf(b)));
}
