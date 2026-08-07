import { describe, expect, it } from "vitest";
import { computeDishDietType } from "./dietType.js";
import { makeIngredient } from "./testFixtures.js";

function resolved(origins: Array<"animal" | "animal_derived" | "plant">) {
  return {
    components: origins.map((animal_origin) => ({
      ingredient: makeIngredient({ animal_origin }),
      quantity: 100,
    })),
  };
}

describe("computeDishDietType", () => {
  it("es vegano si todos los componentes son vegetales", () => {
    expect(computeDishDietType(resolved(["plant", "plant"]))).toBe("vegan");
  });

  it("es vegetariano si hay derivados de animal pero ninguno de origen animal directo", () => {
    expect(computeDishDietType(resolved(["plant", "animal_derived"]))).toBe("vegetarian");
  });

  it("no es vegano ni vegetariano si hay algún componente de origen animal", () => {
    expect(computeDishDietType(resolved(["plant", "animal"]))).toBe("omnivore");
  });

  it("un plato sin componentes es vegano (vacuamente)", () => {
    expect(computeDishDietType(resolved([]))).toBe("vegan");
  });
});
