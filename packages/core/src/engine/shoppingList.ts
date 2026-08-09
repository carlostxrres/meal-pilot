import type { DayProposal, DietaryRequirement, Ingredient } from "./types.js";

export type ShoppingReason = "upcoming_need" | "requirement";

export interface ShoppingListItem {
  ingredient: Ingredient;
  reasons: ShoppingReason[];
  /**
   * Cantidad de reposición: el déficit real hasta cubrir lo necesario.
   * Para "upcoming_need", necesidad de las próximas propuestas menos stock
   * actual. Para "requirement", el mínimo del requisito menos stock actual.
   * Si aplican ambos motivos, se usa el mayor de los dos déficits — cubrir
   * el más exigente cubre también el otro, porque los dos parten del mismo
   * stock total.
   */
  restockQuantity: number;
}

function totalStock(i: Ingredient): number {
  return i.office_inventory + i.home_inventory;
}

/** Suma, por ingrediente, cuánto hace falta a lo largo de varias propuestas de día. */
function sumUpcomingNeed(proposals: readonly DayProposal[]): Map<string, number> {
  const needed = new Map<string, number>();
  for (const proposal of proposals) {
    for (const mealProposal of proposal.meals) {
      if (!mealProposal.resolved) continue;
      for (const component of mealProposal.resolved.components) {
        needed.set(
          component.ingredient.id,
          (needed.get(component.ingredient.id) ?? 0) + component.quantity,
        );
      }
    }
  }
  return needed;
}

/**
 * Deriva la lista de la compra: solo lo que realmente hace falta para las
 * próximas propuestas de día (ej. hoy + mañana), más lo que haga falta para
 * cubrir un `dietary_requirement` mandatory pendiente — nunca una lista
 * editable a mano.
 *
 * `upcomingProposals` debe venir de `generateProposalsForDates` para el
 * horizonte deseado (ver `upcomingDates`). Con 0 propuestas, el primer
 * motivo simplemente no aporta nada (no "todo lo agotado", a diferencia de
 * la versión anterior de este cálculo).
 */
export function computeShoppingList(
  ingredients: readonly Ingredient[],
  requirements: readonly DietaryRequirement[],
  upcomingProposals: readonly DayProposal[] = [],
): ShoppingListItem[] {
  const items = new Map<string, ShoppingListItem>();
  const upcomingNeed = sumUpcomingNeed(upcomingProposals);

  for (const ingredient of ingredients) {
    const needed = upcomingNeed.get(ingredient.id);
    if (needed == null) continue;
    const deficit = needed - totalStock(ingredient);
    if (deficit > 0) {
      items.set(ingredient.id, {
        ingredient,
        reasons: ["upcoming_need"],
        restockQuantity: Math.ceil(deficit),
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
    if (!ingredient) continue;
    const deficit = requirement.minimum - totalStock(ingredient);
    if (deficit <= 0) continue;
    const restockQuantity = Math.ceil(deficit);

    const existing = items.get(ingredient.id);
    if (existing) {
      if (!existing.reasons.includes("requirement")) existing.reasons.push("requirement");
      existing.restockQuantity = Math.max(existing.restockQuantity, restockQuantity);
    } else {
      items.set(ingredient.id, {
        ingredient,
        reasons: ["requirement"],
        restockQuantity,
      });
    }
  }

  return [...items.values()].sort((a, b) => a.ingredient.name.localeCompare(b.ingredient.name));
}
