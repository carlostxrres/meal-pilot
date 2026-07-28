import { describe, expect, it } from "vitest";
import { computeDishPrice } from "./price.js";
import { makeIngredient } from "./testFixtures.js";

describe("computeDishPrice", () => {
  it("suma el precio de cada componente según su cantidad", () => {
    const salmon = makeIngredient({ price_eur_per_100: 1.2 }); // 1,20€/100g
    const arroz = makeIngredient({ price_eur_per_100: 0.25 }); // 0,25€/100g

    const price = computeDishPrice({
      components: [
        { ingredient: salmon, quantity: 150 }, // 1.80
        { ingredient: arroz, quantity: 200 }, // 0.50
      ],
    });

    expect(price).toBeCloseTo(2.3, 5);
  });

  it("ingredientes sin precio aportan 0, no rompen el cálculo", () => {
    const sinPrecio = makeIngredient({ price_eur_per_100: null });
    const price = computeDishPrice({ components: [{ ingredient: sinPrecio, quantity: 100 }] });
    expect(price).toBe(0);
  });

  it("una dish sin componentes cuesta 0", () => {
    expect(computeDishPrice({ components: [] })).toBe(0);
  });
});
