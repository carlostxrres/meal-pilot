import type { Json } from "./database.types.js";

/**
 * Forma congelada de un componente dentro de `planned_meal.components`
 * (ADR-0019): solo ingrediente + cantidad, materializado contra el
 * ingrediente vigente al leer (el ingrediente en sí no se versiona, solo la
 * composición y cantidades del plato comprometido).
 *
 * Vive en su propio fichero (no en `plannedMeal.ts`) para que
 * `fetchDailyContext.ts` pueda importarlo sin crear un ciclo: el roll-forward
 * de `plannedMeal.ts` necesita `fetchDailyContext` para generar los días que
 * falten, y `fetchDailyContext` necesita poder leer `planned_meal` para
 * sembrar la diversidad (ver ADR-0019, "Acumulados y diversidad").
 */
export interface PlannedMealComponent {
  ingredientId: string;
  quantity: number;
}

/** Tolerante a formas inesperadas: es una columna jsonb sin esquema, aunque el único escritor sea este mismo paquete. */
export function parsePlannedMealComponents(json: Json): PlannedMealComponent[] {
  if (!Array.isArray(json)) return [];
  const result: PlannedMealComponent[] = [];
  for (const entry of json) {
    if (typeof entry !== "object" || entry === null || Array.isArray(entry)) continue;
    const record = entry as Record<string, Json>;
    const { ingredientId, quantity } = record;
    if (typeof ingredientId === "string" && typeof quantity === "number") {
      result.push({ ingredientId, quantity });
    }
  }
  return result;
}

export function serializePlannedMealComponents(components: readonly PlannedMealComponent[]): Json {
  return components.map((c) => ({ ingredientId: c.ingredientId, quantity: c.quantity })) as Json;
}
