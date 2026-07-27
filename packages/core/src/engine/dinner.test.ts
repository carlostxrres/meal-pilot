import { describe, expect, it } from "vitest";
import { computeDinnerTargets } from "./dinner.js";
import { makeRequirement } from "./testFixtures.js";
import type { RequirementStatus } from "./types.js";

function makeStatus(overrides: Partial<RequirementStatus> & { requirement: RequirementStatus["requirement"] }): RequirementStatus {
  return {
    accumulated: 0,
    effectiveMinimum: null,
    effectiveMaximum: null,
    withinRange: true,
    ...overrides,
  };
}

describe("computeDinnerTargets", () => {
  it("calcula el residuo hacia el mínimo y el margen hasta el máximo", () => {
    const kcal = makeRequirement({
      scope_type: "nutrient",
      scope_nutrient_column: "kcal_per_100",
      minimum: 2800,
      unit: "kcal",
    });
    const grasa = makeRequirement({
      scope_type: "nutrient",
      scope_nutrient_column: "fat_g_per_100",
      minimum: 70,
      maximum: 115,
      unit: "g",
    });

    const targets = computeDinnerTargets([
      makeStatus({ requirement: kcal, accumulated: 2500 }),
      makeStatus({ requirement: grasa, accumulated: 90 }),
    ]);

    expect(targets[0]!.remainingMinimum).toBe(300);
    expect(targets[0]!.remainingMaximum).toBeNull();
    expect(targets[0]!.covered).toBe(false);
    expect(targets[1]!.remainingMinimum).toBe(0);
    expect(targets[1]!.remainingMaximum).toBe(25);
    expect(targets[1]!.covered).toBe(true);
  });

  it("no deja el residuo del mínimo en negativo cuando ya se superó", () => {
    const proteina = makeRequirement({
      scope_type: "nutrient",
      scope_nutrient_column: "protein_g_per_100",
      minimum: 160,
      unit: "g",
    });

    const targets = computeDinnerTargets([
      makeStatus({ requirement: proteina, accumulated: 180 }),
    ]);

    expect(targets[0]!.remainingMinimum).toBe(0);
    expect(targets[0]!.covered).toBe(true);
  });

  it("excluye requisitos semanales y requisitos ligados a un meal", () => {
    const semanal = makeRequirement({ period: "week", week_reset_day: "mon", minimum: 240 });
    const deMeal = makeRequirement({ meal_id: "meal-1", minimum: 25 });
    const diarioGlobal = makeRequirement({ minimum: 100 });

    const targets = computeDinnerTargets([
      makeStatus({ requirement: semanal }),
      makeStatus({ requirement: deMeal }),
      makeStatus({ requirement: diarioGlobal }),
    ]);

    expect(targets).toHaveLength(1);
    expect(targets[0]!.requirement.id).toBe(diarioGlobal.id);
  });
});
