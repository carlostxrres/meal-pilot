import type { ResolvedDish } from "./types.js";

export type DishDietType = "vegan" | "vegetarian" | "omnivore";

/**
 * Vegano si todos los componentes son de origen vegetal; vegetariano si
 * ninguno es de origen animal directo (permite derivados como huevo/lácteos);
 * en cualquier otro caso, no. Los suplementos no entran (no forman parte de
 * `components`, ver ADR-0021), así que no afectan a esta clasificación.
 */
export function computeDishDietType(resolved: Pick<ResolvedDish, "components">): DishDietType {
  const origins = resolved.components.map((c) => c.ingredient.animal_origin);
  if (origins.every((origin) => origin === "plant")) return "vegan";
  if (origins.every((origin) => origin !== "animal")) return "vegetarian";
  return "omnivore";
}
