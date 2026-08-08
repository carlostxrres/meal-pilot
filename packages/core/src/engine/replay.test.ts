import { describe, expect, it } from "vitest";
import { replayAccumulation } from "./resolve.js";
import { makeDish, makeIngredient, makeRequirement } from "./testFixtures.js";
import type { ResolvedDish } from "./types.js";

function dishOf(ingredientId: string, quantity: number): ResolvedDish {
  return {
    dish: makeDish(),
    components: [{ ingredient: makeIngredient({ id: ingredientId }), quantity }],
  };
}

describe("replayAccumulation", () => {
  it("acumula un requisito semanal a través de varios días sin reiniciarlo (misma ventana)", () => {
    const requirement = makeRequirement({
      scope_type: "ingredient",
      scope_ingredient_id: "sardinas",
      period: "week",
      week_reset_day: "mon",
      minimum: 150,
      strictness: "mandatory",
    });

    const days = [
      { date: "2026-08-04", resolvedByMealId: new Map([["meal-1", dishOf("sardinas", 100)]]) }, // martes
      { date: "2026-08-05", resolvedByMealId: new Map([["meal-1", dishOf("sardinas", 100)]]) }, // miércoles, misma semana
    ];

    const { accumulated } = replayAccumulation(days, [requirement], new Map());
    expect(accumulated.get(requirement.id)).toBe(200);
  });

  it("reinicia un requisito diario cada día", () => {
    const requirement = makeRequirement({
      scope_type: "ingredient",
      scope_ingredient_id: "vitc",
      period: "day",
      minimum: 40,
      strictness: "mandatory",
    });

    const days = [
      { date: "2026-08-01", resolvedByMealId: new Map([["meal-1", dishOf("vitc", 50)]]) },
      { date: "2026-08-02", resolvedByMealId: new Map([["meal-1", dishOf("vitc", 50)]]) },
    ];

    const { accumulated } = replayAccumulation(days, [requirement], new Map());
    expect(accumulated.get(requirement.id)).toBe(50); // si no reiniciara, sería 100
  });

  it("reinicia un requisito semanal al cruzar el día de reset", () => {
    const requirement = makeRequirement({
      scope_type: "ingredient",
      scope_ingredient_id: "sardinas",
      period: "week",
      week_reset_day: "mon",
      minimum: 150,
      strictness: "mandatory",
    });

    const days = [
      { date: "2026-08-02", resolvedByMealId: new Map([["meal-1", dishOf("sardinas", 100)]]) }, // domingo, semana anterior
      { date: "2026-08-03", resolvedByMealId: new Map([["meal-1", dishOf("sardinas", 100)]]) }, // lunes, cruza el reset
    ];

    const { accumulated } = replayAccumulation(days, [requirement], new Map());
    expect(accumulated.get(requirement.id)).toBe(100); // no 200: el lunes empieza de cero
  });

  it("une recentlyUsedIngredientIds de todos los días, ignorando los slots sin resolver", () => {
    const days = [
      { date: "2026-08-01", resolvedByMealId: new Map([["meal-1", dishOf("a", 50)], ["meal-2", null]]) },
      { date: "2026-08-02", resolvedByMealId: new Map([["meal-1", dishOf("b", 50)]]) },
    ];

    const { recentlyUsedIngredientIds } = replayAccumulation(days, [], new Map());
    expect(recentlyUsedIngredientIds).toEqual(new Set(["a", "b"]));
  });

  it("accumulatedByDay da el snapshot correcto para un día intermedio de la ventana replayada", () => {
    const requirement = makeRequirement({
      scope_type: "ingredient",
      scope_ingredient_id: "sardinas",
      period: "week",
      week_reset_day: "mon",
      minimum: 150,
      strictness: "mandatory",
    });

    // Ventana de replay que empieza el lunes (inicio de semana) aunque solo
    // interese leer el status del miércoles -- el caso real de "Hoy" con
    // horizonte rodante a mitad de semana.
    const days = [
      { date: "2026-08-03", resolvedByMealId: new Map([["meal-1", dishOf("sardinas", 50)]]) }, // lunes
      { date: "2026-08-04", resolvedByMealId: new Map([["meal-1", dishOf("sardinas", 50)]]) }, // martes
      { date: "2026-08-05", resolvedByMealId: new Map([["meal-1", dishOf("sardinas", 50)]]) }, // miércoles
    ];

    const { accumulatedByDay } = replayAccumulation(days, [requirement], new Map());
    expect(accumulatedByDay).toHaveLength(3);
    expect(accumulatedByDay[0]!.get(requirement.id)).toBe(50);
    expect(accumulatedByDay[1]!.get(requirement.id)).toBe(100);
    expect(accumulatedByDay[2]!.get(requirement.id)).toBe(150);
  });
});
