import { describe, expect, it } from "vitest";
import { sortByNutrientDisplayOrder } from "./nutrientOrder.js";
import { makeRequirement } from "./testFixtures.js";

function statusFor(column: string | null) {
  return { requirement: makeRequirement({ scope_type: "nutrient", scope_nutrient_column: column }) };
}

describe("sortByNutrientDisplayOrder", () => {
  it("coloca cada sub-nutriente justo después de su padre, sin importar el orden de entrada", () => {
    const input = [
      statusFor("sodium_mg_per_100"),
      statusFor("sugar_g_per_100"),
      statusFor("kcal_per_100"),
      statusFor("carbs_g_per_100"),
      statusFor("saturated_fat_g_per_100"),
      statusFor("fat_g_per_100"),
      statusFor("protein_g_per_100"),
      statusFor("fiber_g_per_100"),
    ];

    const sorted = sortByNutrientDisplayOrder(input).map((s) => s.requirement.scope_nutrient_column);

    expect(sorted).toEqual([
      "kcal_per_100",
      "fat_g_per_100",
      "saturated_fat_g_per_100",
      "carbs_g_per_100",
      "sugar_g_per_100",
      "fiber_g_per_100",
      "protein_g_per_100",
      "sodium_mg_per_100",
    ]);
  });

  it("manda al final, de forma estable, columnas fuera de la lista conocida", () => {
    const iron = statusFor("iron_mg_per_100");
    const calcium = statusFor("calcium_mg_per_100");
    const kcal = statusFor("kcal_per_100");

    const sorted = sortByNutrientDisplayOrder([iron, calcium, kcal]);

    expect(sorted[0]).toBe(kcal);
    expect(sorted[1]).toBe(iron);
    expect(sorted[2]).toBe(calcium);
  });
});
