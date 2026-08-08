import type { DayProposal, Meal, ResolvedComponent, ResolvedDish } from "./types.js";

export interface MealCarryList {
  meal: Meal;
  components: ResolvedComponent[];
}

/**
 * Heurística simple: un componente "no está disponible en la oficina" si el
 * stock de oficina por sí solo no cubre la cantidad que ese componente
 * necesita. A diferencia del resto del motor (que desde ADR-0020 sí simula
 * consumo con un stock virtual decrementado dish a dish), esto compara
 * contra el inventario nominal de oficina sin descontar lo que otros meals
 * del mismo día ya se habrían llevado — limitación conocida (ver
 * docs/status.md), no una inconsistencia introducida por el ADR-0020.
 */
function componentsNeedingCarry(resolved: ResolvedDish): ResolvedComponent[] {
  return resolved.components.filter((c) => c.ingredient.office_inventory < c.quantity);
}

function componentsAvailableAtOffice(resolved: ResolvedDish): ResolvedComponent[] {
  return resolved.components.filter((c) => c.ingredient.office_inventory >= c.quantity);
}

/**
 * Qué llevar de casa a la oficina por la mañana (ADR-0001: los 4 meals están
 * en un orden fijo, el desayuno es siempre el primero y se come en casa, así
 * que no necesita nada — se listan los otros 3).
 */
export function computeHomeToOfficeCarry(proposal: DayProposal): MealCarryList[] {
  return proposal.meals
    .slice(1)
    .filter((m): m is typeof m & { resolved: ResolvedDish } => m.resolved !== null)
    .map((m) => ({ meal: m.meal, components: componentsNeedingCarry(m.resolved) }))
    .filter((m) => m.components.length > 0);
}

/**
 * Qué recoger de la oficina antes de salir hacia la calle, solo para el
 * último meal del día (snack post-entreno). Un ingrediente que ya se llevó
 * de casa por la mañana (ver `computeHomeToOfficeCarry`) nunca aparece aquí:
 * "disponible en oficina" y "hay que llevar de casa" son mutuamente
 * excluyentes por componente.
 */
export function computeOfficeToStreetGrab(proposal: DayProposal): MealCarryList | null {
  const last = proposal.meals[proposal.meals.length - 1];
  if (!last?.resolved) return null;
  const components = componentsAvailableAtOffice(last.resolved);
  return components.length > 0 ? { meal: last.meal, components } : null;
}
