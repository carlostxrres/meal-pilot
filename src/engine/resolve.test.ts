import { describe, expect, it } from "vitest";
import { createSeededRandom } from "./random.js";
import { generateDayProposal } from "./resolve.js";
import {
  buildTestContext,
  makeDish,
  makeDishIngredient,
  makeIngredient,
  makeMeal,
  makeRequirement,
} from "./testFixtures.js";

describe("generateDayProposal", () => {
  it("resuelve un hueco flexible eligiendo un ingrediente de la categoría", () => {
    const pollo = makeIngredient({ name: "Pollo" });
    const pavo = makeIngredient({ name: "Pavo" });
    const meal = makeMeal({ name: "Comida" });
    const dish = makeDish({ name: "Ensalada" });
    const slot = makeDishIngredient({
      dish_id: dish.id,
      category_id: "cat-proteina",
      required: false,
      quantity: 50,
    });

    const ctx = buildTestContext({
      date: "2026-08-01",
      ingredients: [pollo, pavo],
      categoryLinks: [
        { ingredientId: pollo.id, categoryId: "cat-proteina" },
        { ingredientId: pavo.id, categoryId: "cat-proteina" },
      ],
      meals: [{ meal, dish, components: [slot] }],
    });

    const proposal = generateDayProposal(ctx, createSeededRandom("2026-08-01"));
    const mealProposal = proposal.meals[0]!;

    expect(mealProposal.resolved).not.toBeNull();
    expect(mealProposal.resolved!.components).toHaveLength(1);
    expect([pollo.name, pavo.name]).toContain(mealProposal.resolved!.components[0]!.ingredient.name);
  });

  it("prioriza el ingrediente que ya está en inventario", () => {
    const enStock = makeIngredient({ name: "En stock", office_inventory: 200 });
    const sinStock = makeIngredient({ name: "Sin stock", office_inventory: 0, home_inventory: 0 });
    const meal = makeMeal();
    const dish = makeDish();
    const slot = makeDishIngredient({ dish_id: dish.id, category_id: "cat", quantity: 50, required: false });

    const ctx = buildTestContext({
      date: "2026-08-01",
      ingredients: [enStock, sinStock],
      categoryLinks: [
        { ingredientId: enStock.id, categoryId: "cat" },
        { ingredientId: sinStock.id, categoryId: "cat" },
      ],
      meals: [{ meal, dish, components: [slot] }],
    });

    const proposal = generateDayProposal(ctx, createSeededRandom("2026-08-01"));
    expect(proposal.meals[0]!.resolved!.components[0]!.ingredient.name).toBe("En stock");
  });

  it("prioriza el ingrediente que ayuda a un requisito mandatory no cumplido", () => {
    const ricoEnVitC = makeIngredient({ name: "Rico en vitC", vitamin_c_mg_per_100: 80 });
    const pobreEnVitC = makeIngredient({ name: "Pobre en vitC", vitamin_c_mg_per_100: 0 });
    const meal = makeMeal();
    const dish = makeDish();
    const slot = makeDishIngredient({ dish_id: dish.id, category_id: "cat", quantity: 50, required: false });
    const requirement = makeRequirement({
      scope_type: "nutrient",
      scope_nutrient_column: "vitamin_c_mg_per_100",
      minimum: 80,
      unit: "mg",
      strictness: "mandatory",
    });

    const ctx = buildTestContext({
      date: "2026-08-01",
      ingredients: [ricoEnVitC, pobreEnVitC],
      categoryLinks: [
        { ingredientId: ricoEnVitC.id, categoryId: "cat" },
        { ingredientId: pobreEnVitC.id, categoryId: "cat" },
      ],
      meals: [{ meal, dish, components: [slot] }],
      requirements: [requirement],
    });

    const proposal = generateDayProposal(ctx, createSeededRandom("2026-08-01"));
    expect(proposal.meals[0]!.resolved!.components[0]!.ingredient.name).toBe("Rico en vitC");
  });

  it("con fechas distintas puede elegir un ingrediente empatado distinto (semilla por fecha)", () => {
    const a = makeIngredient({ name: "A" });
    const b = makeIngredient({ name: "B" });
    const meal = makeMeal();
    const dish = makeDish();
    const slot = makeDishIngredient({ dish_id: dish.id, category_id: "cat", quantity: 50, required: false });

    function proposalFor(date: string) {
      const ctx = buildTestContext({
        date,
        ingredients: [a, b],
        categoryLinks: [
          { ingredientId: a.id, categoryId: "cat" },
          { ingredientId: b.id, categoryId: "cat" },
        ],
        meals: [{ meal, dish, components: [slot] }],
      });
      return generateDayProposal(ctx, createSeededRandom(date)).meals[0]!.resolved!.components[0]!.ingredient.name;
    }

    // Mismo día -> mismo resultado (reproducible).
    expect(proposalFor("2026-08-01")).toBe(proposalFor("2026-08-01"));

    // Con varias fechas distintas, en algún momento debe variar el elegido
    // (si no, la semilla no estaría influyendo en el desempate).
    const results = new Set(
      ["2026-08-01", "2026-08-02", "2026-08-03", "2026-08-04", "2026-08-05"].map(proposalFor),
    );
    expect(results.size).toBeGreaterThan(1);
  });

  it("descarta una dish que violaría un requisito mandatory de máximo", () => {
    const atun = makeIngredient({ name: "Atún en lata" });
    const meal = makeMeal();
    const dish = makeDish({ name: "Con atún" });
    const component = makeDishIngredient({
      dish_id: dish.id,
      ingredient_id: atun.id,
      quantity: 300,
      required: true,
    });
    const requirement = makeRequirement({
      scope_type: "ingredient",
      scope_ingredient_id: atun.id,
      maximum: 240,
      unit: "g",
      strictness: "mandatory",
      tolerance_margin: 0,
    });

    const ctx = buildTestContext({
      date: "2026-08-01",
      ingredients: [atun],
      meals: [{ meal, dish, components: [component] }],
      requirements: [requirement],
    });

    const proposal = generateDayProposal(ctx, createSeededRandom("2026-08-01"));
    const mealProposal = proposal.meals[0]!;
    expect(mealProposal.resolved).toBeNull();
    expect(mealProposal.unresolvedReason).toMatch(/requisito obligatorio/);
  });

  it("marca el meal sin candidatas cuando no hay ninguna dish asociada", () => {
    const meal = makeMeal({ name: "Meal vacío" });
    const ctx = buildTestContext({
      date: "2026-08-01",
      ingredients: [],
      meals: [],
      requirements: [],
    });
    // Se añade el meal manualmente sin candidatos, simulando meal_dish vacío.
    ctx.meals.push({ meal, candidates: [], supplement: null });

    const proposal = generateDayProposal(ctx, createSeededRandom("2026-08-01"));
    const mealProposal = proposal.meals.find((m) => m.meal.id === meal.id)!;
    expect(mealProposal.resolved).toBeNull();
    expect(mealProposal.unresolvedReason).toMatch(/No hay ninguna dish/);
  });
});
