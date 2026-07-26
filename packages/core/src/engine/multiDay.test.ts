import { describe, expect, it } from "vitest";
import { createSeededRandom } from "./random.js";
import { generateMultiDayPlan } from "./resolve.js";
import {
  buildTestContext,
  makeDish,
  makeDishIngredient,
  makeIngredient,
  makeMeal,
  makeRequirement,
} from "./testFixtures.js";
import type { DailyContext } from "./types.js";

function withDate(ctx: DailyContext, date: string): DailyContext {
  return { ...ctx, date };
}

describe("generateMultiDayPlan", () => {
  it("no repite un ingrediente flexible elegido el día anterior si hay alternativa igual de válida", () => {
    const a = makeIngredient({ name: "A" });
    const b = makeIngredient({ name: "B" });
    const meal = makeMeal();
    const dish = makeDish();
    const slot = makeDishIngredient({ dish_id: dish.id, category_id: "cat", quantity: 50, required: false });

    const baseCtx = buildTestContext({
      date: "2026-08-01",
      ingredients: [a, b],
      categoryLinks: [
        { ingredientId: a.id, categoryId: "cat" },
        { ingredientId: b.id, categoryId: "cat" },
      ],
      meals: [{ meal, dish, components: [slot] }],
    });

    const contexts = [withDate(baseCtx, "2026-08-01"), withDate(baseCtx, "2026-08-02")];
    const [day1, day2] = generateMultiDayPlan(contexts, createSeededRandom("plan"));

    const chosen1 = day1!.meals[0]!.resolved!.components[0]!.ingredient.name;
    const chosen2 = day2!.meals[0]!.resolved!.components[0]!.ingredient.name;
    expect(chosen2).not.toBe(chosen1);
  });

  it("acumula un requisito semanal a través de varios días sin reiniciarlo", () => {
    const sardinas = makeIngredient({ name: "Sardinas" });
    const meal = makeMeal();
    const dish = makeDish();
    const component = makeDishIngredient({
      dish_id: dish.id,
      ingredient_id: sardinas.id,
      quantity: 100,
      required: true,
    });
    const requirement = makeRequirement({
      scope_type: "ingredient",
      scope_ingredient_id: sardinas.id,
      period: "week",
      week_reset_day: "mon",
      minimum: 150,
      strictness: "mandatory",
    });

    const baseCtx = buildTestContext({
      date: "2026-08-04", // martes
      ingredients: [sardinas],
      meals: [{ meal, dish, components: [component] }],
      requirements: [requirement],
    });

    // martes y miércoles, misma semana (reset lunes)
    const contexts = [withDate(baseCtx, "2026-08-04"), withDate(baseCtx, "2026-08-05")];
    const [day1, day2] = generateMultiDayPlan(contexts, createSeededRandom("plan"));

    const status1 = day1!.requirementStatuses[0]!;
    const status2 = day2!.requirementStatuses[0]!;
    expect(status1.accumulated).toBe(100);
    expect(status2.accumulated).toBe(200); // 100 + 100, no se reinicia
  });

  it("reinicia un requisito diario cada día", () => {
    const vitaminaC = makeIngredient({ name: "Rica en vitC", vitamin_c_mg_per_100: 100 });
    const meal = makeMeal();
    const dish = makeDish();
    const component = makeDishIngredient({
      dish_id: dish.id,
      ingredient_id: vitaminaC.id,
      quantity: 50,
      required: true,
    });
    const requirement = makeRequirement({
      scope_type: "nutrient",
      scope_nutrient_column: "vitamin_c_mg_per_100",
      period: "day",
      minimum: 40,
      unit: "mg",
      strictness: "mandatory",
    });

    const baseCtx = buildTestContext({
      date: "2026-08-01",
      ingredients: [vitaminaC],
      meals: [{ meal, dish, components: [component] }],
      requirements: [requirement],
    });

    const contexts = [withDate(baseCtx, "2026-08-01"), withDate(baseCtx, "2026-08-02")];
    const [day1, day2] = generateMultiDayPlan(contexts, createSeededRandom("plan"));

    // Cada día aporta 50g * 100mg/100g = 50mg — si se acumulara sin reiniciar, day2 sería 100.
    expect(day1!.requirementStatuses[0]!.accumulated).toBe(50);
    expect(day2!.requirementStatuses[0]!.accumulated).toBe(50);
  });

  it("con una sola fecha se comporta igual que generateDayProposal", () => {
    const ingrediente = makeIngredient({ name: "Solo" });
    const meal = makeMeal();
    const dish = makeDish();
    const component = makeDishIngredient({ dish_id: dish.id, ingredient_id: ingrediente.id, quantity: 10 });
    const ctx = buildTestContext({
      date: "2026-08-01",
      ingredients: [ingrediente],
      meals: [{ meal, dish, components: [component] }],
    });

    const [only] = generateMultiDayPlan([ctx], createSeededRandom("2026-08-01"));
    expect(only!.date).toBe("2026-08-01");
    expect(only!.meals[0]!.resolved!.components[0]!.ingredient.name).toBe("Solo");
  });
});
