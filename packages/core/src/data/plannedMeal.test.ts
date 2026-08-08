import { describe, expect, it } from "vitest";
import { makeDish, makeIngredient } from "../engine/testFixtures.js";
import { reconstructResolvedDish } from "./plannedMeal.js";

describe("reconstructResolvedDish", () => {
  it("devuelve null cuando el slot nunca tuvo candidata (dish_id y dish_name null)", () => {
    const resolved = reconstructResolvedDish(
      { dish_id: null, dish_name: null, components: [], generated_at: "2026-08-01T00:00:00Z" },
      new Map(),
      new Map(),
    );
    expect(resolved).toBeNull();
  });

  it("usa la dish vigente del catálogo cuando dish_id sigue existiendo", () => {
    const pan = makeIngredient({ name: "Pan" });
    const dish = makeDish({ name: "Bocadillo" });
    const resolved = reconstructResolvedDish(
      {
        dish_id: dish.id,
        dish_name: "Bocadillo",
        components: [{ ingredientId: pan.id, quantity: 80 }],
        generated_at: "2026-08-01T00:00:00Z",
      },
      new Map([[dish.id, dish]]),
      new Map([[pan.id, pan]]),
    );
    expect(resolved).not.toBeNull();
    expect(resolved!.dish).toBe(dish); // la fila viva, no un placeholder
    expect(resolved!.components).toEqual([{ ingredient: pan, quantity: 80 }]);
  });

  it("las cantidades vienen de components (congelado), no de dish_ingredient vigente", () => {
    // Si updateDish cambió la cantidad después de comprometer, lo mostrado
    // sigue siendo lo prometido -- por eso reconstructResolvedDish nunca
    // vuelve a mirar dish_ingredient, solo el jsonb congelado de la fila.
    const pan = makeIngredient({ name: "Pan" });
    const dish = makeDish({ name: "Bocadillo" });
    const resolved = reconstructResolvedDish(
      {
        dish_id: dish.id,
        dish_name: "Bocadillo",
        components: [{ ingredientId: pan.id, quantity: 80 }], // congelado en su día
        generated_at: "2026-08-01T00:00:00Z",
      },
      new Map([[dish.id, dish]]),
      new Map([[pan.id, pan]]),
    );
    expect(resolved!.components[0]!.quantity).toBe(80);
  });

  it("sintetiza un placeholder con el nombre congelado cuando la dish ya no existe (ON DELETE SET NULL)", () => {
    const pan = makeIngredient({ name: "Pan" });
    const resolved = reconstructResolvedDish(
      {
        dish_id: null, // la FK ya lo puso a null al borrar la dish
        dish_name: "Bocadillo (ya no existe)",
        components: [{ ingredientId: pan.id, quantity: 80 }],
        generated_at: "2026-08-01T00:00:00Z",
      },
      new Map(), // catálogo vigente sin esa dish
      new Map([[pan.id, pan]]),
    );
    expect(resolved).not.toBeNull();
    expect(resolved!.dish.name).toBe("Bocadillo (ya no existe)");
    expect(resolved!.dish.active).toBe(false);
    expect(resolved!.components).toEqual([{ ingredient: pan, quantity: 80 }]);
  });

  it("descarta componentes cuyo ingrediente ya no existe en el catálogo", () => {
    const dish = makeDish({ name: "Bocadillo" });
    const resolved = reconstructResolvedDish(
      {
        dish_id: dish.id,
        dish_name: "Bocadillo",
        components: [{ ingredientId: "ingrediente-borrado", quantity: 80 }],
        generated_at: "2026-08-01T00:00:00Z",
      },
      new Map([[dish.id, dish]]),
      new Map(), // sin ese ingrediente
    );
    expect(resolved!.components).toEqual([]);
  });
});
