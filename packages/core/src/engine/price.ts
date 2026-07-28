import type { ResolvedComponent, ResolvedDish } from "./types.js";

/** Precio aproximado (EUR) de un componente ya resuelto, dada su cantidad. */
function componentPrice(component: ResolvedComponent): number {
  const perHundred = component.ingredient.price_eur_per_100;
  return typeof perHundred === "number" ? (perHundred * component.quantity) / 100 : 0;
}

/** Precio aproximado (EUR) de una dish: suma de sus componentes. Ingredientes sin precio aportan 0. */
export function computeDishPrice(resolved: Pick<ResolvedDish, "components">): number {
  return resolved.components.reduce((sum, c) => sum + componentPrice(c), 0);
}
