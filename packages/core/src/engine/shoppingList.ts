import type { DietaryRequirement, Ingredient } from "./types.js";

export type ShoppingReason = "out_of_stock" | "requirement";

export interface ShoppingListItem {
  ingredient: Ingredient;
  reasons: ShoppingReason[];
  /**
   * Cantidad de reposición estimada, para sumar a home_inventory al tachar
   * el ítem. v1: un valor fijo por tipo de unidad, no calculado a partir de
   * las dishes que usan el ingrediente — ver docs/plans/2026-07-26-ui-
   * design-system-and-ia.md ("afinar durante la implementación"). Editable
   * después a mano en Inventario si no cuadra.
   */
  restockQuantity: number;
}

const DEFAULT_RESTOCK: Record<Ingredient["base_unit"], number> = {
  g: 200,
  ml: 200,
  unit: 2,
};

/**
 * Deriva la lista de la compra a partir del inventario actual y los
 * requisitos dietéticos — nunca es una lista editable a mano (ver ADR de
 * diseño de interfaz). Dos motivos posibles, no excluyentes:
 *   - "out_of_stock": inventario total (oficina+casa) <= 0.
 *   - "requirement": es el ingrediente concreto de un dietary_requirement
 *     mandatory de tipo `ingredient` cuyo mínimo no cubre el stock actual
 *     (comprobación de stock físico, no de acumulado por periodo real —
 *     misma simplificación que el resto del motor mientras no se escriba
 *     en requirement_log).
 */
export function computeShoppingList(
  ingredients: readonly Ingredient[],
  requirements: readonly DietaryRequirement[],
): ShoppingListItem[] {
  const items = new Map<string, ShoppingListItem>();

  const totalStock = (i: Ingredient) => i.office_inventory + i.home_inventory;

  for (const ingredient of ingredients) {
    if (totalStock(ingredient) <= 0) {
      items.set(ingredient.id, {
        ingredient,
        reasons: ["out_of_stock"],
        restockQuantity: DEFAULT_RESTOCK[ingredient.base_unit],
      });
    }
  }

  for (const requirement of requirements) {
    if (
      requirement.strictness !== "mandatory" ||
      requirement.scope_type !== "ingredient" ||
      !requirement.scope_ingredient_id ||
      requirement.minimum == null
    ) {
      continue;
    }
    const ingredient = ingredients.find((i) => i.id === requirement.scope_ingredient_id);
    if (!ingredient || totalStock(ingredient) >= requirement.minimum) continue;

    const existing = items.get(ingredient.id);
    if (existing) {
      if (!existing.reasons.includes("requirement")) existing.reasons.push("requirement");
    } else {
      items.set(ingredient.id, {
        ingredient,
        reasons: ["requirement"],
        restockQuantity: DEFAULT_RESTOCK[ingredient.base_unit],
      });
    }
  }

  return [...items.values()].sort((a, b) => a.ingredient.name.localeCompare(b.ingredient.name));
}
