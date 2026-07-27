import { describe, expect, it } from "vitest";
import { checkDishCompliance } from "./compliance.js";
import { makeCandidate, makeIngredient, makeRequirement } from "./testFixtures.js";
import type { ResolvedDish } from "./types.js";

function toResolved(candidate: ReturnType<typeof makeCandidate>, ingredients: Map<string, ReturnType<typeof makeIngredient>>): ResolvedDish {
  return {
    dish: candidate.dish,
    components: candidate.components.map((c) => ({
      ingredient: ingredients.get(c.ingredient_id)!,
      quantity: c.quantity,
    })),
  };
}

describe("checkDishCompliance", () => {
  it("valida una dish dentro de la ventana de su meal", () => {
    const avena = makeIngredient({ name: "Avena", kcal_per_100: 300 });
    const candidate = makeCandidate("meal-1", [{ ingredient: avena, quantity: 200 }]); // 600 kcal
    const window = makeRequirement({
      scope_type: "nutrient",
      scope_nutrient_column: "kcal_per_100",
      meal_id: "meal-1",
      minimum: 550,
      maximum: 650,
      unit: "kcal",
    });

    const result = checkDishCompliance(
      toResolved(candidate, new Map([[avena.id, avena]])),
      [window],
    );

    expect(result.compliant).toBe(true);
    expect(result.checks).toHaveLength(1);
    expect(result.checks[0]!.value).toBe(600);
  });

  it("marca una dish fuera de ventana (aunque solo falle un nutriente)", () => {
    const avena = makeIngredient({ name: "Avena", kcal_per_100: 300, protein_g_per_100: 5 });
    const candidate = makeCandidate("meal-1", [{ ingredient: avena, quantity: 200 }]); // 600 kcal, 10 g prot
    const kcalWindow = makeRequirement({
      scope_type: "nutrient",
      scope_nutrient_column: "kcal_per_100",
      meal_id: "meal-1",
      minimum: 550,
      maximum: 650,
      unit: "kcal",
    });
    const proteinWindow = makeRequirement({
      scope_type: "nutrient",
      scope_nutrient_column: "protein_g_per_100",
      meal_id: "meal-1",
      minimum: 25,
      maximum: 32,
      unit: "g",
      tolerance_margin: 0,
    });

    const result = checkDishCompliance(
      toResolved(candidate, new Map([[avena.id, avena]])),
      [kcalWindow, proteinWindow],
    );

    expect(result.compliant).toBe(false);
    const failing = result.checks.find((c) => !c.withinWindow)!;
    expect(failing.requirement.scope_nutrient_column).toBe("protein_g_per_100");
  });

  it("ignora requisitos de otros meals y requisitos globales", () => {
    const avena = makeIngredient({ name: "Avena", kcal_per_100: 300 });
    const candidate = makeCandidate("meal-1", [{ ingredient: avena, quantity: 200 }]);
    const otherMeal = makeRequirement({
      scope_type: "nutrient",
      scope_nutrient_column: "kcal_per_100",
      meal_id: "meal-2",
      minimum: 5000,
      unit: "kcal",
    });
    const globalDaily = makeRequirement({
      scope_type: "nutrient",
      scope_nutrient_column: "kcal_per_100",
      meal_id: null,
      minimum: 2800,
      unit: "kcal",
    });

    const result = checkDishCompliance(
      toResolved(candidate, new Map([[avena.id, avena]])),
      [otherMeal, globalDaily],
    );

    expect(result.checks).toHaveLength(0);
    expect(result.compliant).toBe(true);
  });
});
