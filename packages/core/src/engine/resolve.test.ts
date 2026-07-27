import { describe, expect, it } from "vitest";
import { createSeededRandom } from "./random.js";
import { generateDayProposal } from "./resolve.js";
import {
  buildTestContext,
  makeCandidate,
  makeIngredient,
  makeMeal,
  makeRequirement,
} from "./testFixtures.js";

describe("generateDayProposal", () => {
  it("materializa una dish fija completa (todos sus componentes, con cantidades)", () => {
    const pan = makeIngredient({ name: "Pan" });
    const pavo = makeIngredient({ name: "Pavo" });
    const meal = makeMeal({ name: "Comida" });
    const candidate = makeCandidate(meal.id, [
      { ingredient: pan, quantity: 80 },
      { ingredient: pavo, quantity: 50 },
    ]);

    const ctx = buildTestContext({
      date: "2026-08-01",
      ingredients: [pan, pavo],
      meals: [{ meal, candidates: [candidate] }],
    });

    const proposal = generateDayProposal(ctx, createSeededRandom("2026-08-01"));
    const resolved = proposal.meals[0]!.resolved!;

    expect(resolved.dish.id).toBe(candidate.dish.id);
    expect(resolved.components.map((c) => [c.ingredient.name, c.quantity])).toEqual([
      ["Pan", 80],
      ["Pavo", 50],
    ]);
  });

  it("prioriza la dish cuyos ingredientes ya están en inventario", () => {
    const enStock = makeIngredient({ name: "En stock", office_inventory: 200 });
    const sinStock = makeIngredient({ name: "Sin stock" });
    const meal = makeMeal();
    const conStock = makeCandidate(meal.id, [{ ingredient: enStock, quantity: 50 }]);
    const sinStockDish = makeCandidate(meal.id, [{ ingredient: sinStock, quantity: 50 }]);

    const ctx = buildTestContext({
      date: "2026-08-01",
      ingredients: [enStock, sinStock],
      meals: [{ meal, candidates: [conStock, sinStockDish] }],
    });

    const proposal = generateDayProposal(ctx, createSeededRandom("2026-08-01"));
    expect(proposal.meals[0]!.resolved!.dish.id).toBe(conStock.dish.id);
  });

  it("prioriza la dish que ayuda a un requisito global mandatory no cumplido", () => {
    const ricoEnVitC = makeIngredient({ name: "Rico en vitC", vitamin_c_mg_per_100: 80 });
    const pobreEnVitC = makeIngredient({ name: "Pobre en vitC", vitamin_c_mg_per_100: 0 });
    const meal = makeMeal();
    const conVitC = makeCandidate(meal.id, [{ ingredient: ricoEnVitC, quantity: 50 }]);
    const sinVitC = makeCandidate(meal.id, [{ ingredient: pobreEnVitC, quantity: 50 }]);
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
      meals: [{ meal, candidates: [conVitC, sinVitC] }],
      requirements: [requirement],
    });

    const proposal = generateDayProposal(ctx, createSeededRandom("2026-08-01"));
    expect(proposal.meals[0]!.resolved!.dish.id).toBe(conVitC.dish.id);
  });

  it("con fechas distintas puede elegir una dish empatada distinta (semilla por fecha)", () => {
    const a = makeIngredient({ name: "A" });
    const b = makeIngredient({ name: "B" });
    const meal = makeMeal();
    const dishA = makeCandidate(meal.id, [{ ingredient: a, quantity: 50 }]);
    const dishB = makeCandidate(meal.id, [{ ingredient: b, quantity: 50 }]);

    function proposalFor(date: string) {
      const ctx = buildTestContext({
        date,
        ingredients: [a, b],
        meals: [{ meal, candidates: [dishA, dishB] }],
      });
      return generateDayProposal(ctx, createSeededRandom(date)).meals[0]!.resolved!.dish.id;
    }

    // Mismo día -> mismo resultado (reproducible).
    expect(proposalFor("2026-08-01")).toBe(proposalFor("2026-08-01"));

    // Con varias fechas distintas, en algún momento debe variar la elegida
    // (si no, la semilla no estaría influyendo en el desempate).
    const results = new Set(
      ["2026-08-01", "2026-08-02", "2026-08-03", "2026-08-04", "2026-08-05"].map(proposalFor),
    );
    expect(results.size).toBeGreaterThan(1);
  });

  it("descarta una dish que violaría un techo mandatory global (ej. atún semanal)", () => {
    const atun = makeIngredient({ name: "Atún en lata" });
    const meal = makeMeal();
    const conAtun = makeCandidate(meal.id, [{ ingredient: atun, quantity: 300 }]);
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
      meals: [{ meal, candidates: [conAtun] }],
      requirements: [requirement],
    });

    const proposal = generateDayProposal(ctx, createSeededRandom("2026-08-01"));
    const mealProposal = proposal.meals[0]!;
    expect(mealProposal.resolved).toBeNull();
    expect(mealProposal.unresolvedReason).toMatch(/requisito obligatorio/);
  });

  it("no filtra por la ventana nutricional del propio meal (se cumple por construcción, ADR-0018)", () => {
    // Dish fuera de la ventana kcal de su meal: se propone igualmente (la
    // validación es de autoría, la marca /dishes), nunca deja al meal vacío.
    const denso = makeIngredient({ name: "Denso", kcal_per_100: 900 });
    const meal = makeMeal();
    const dish = makeCandidate(meal.id, [{ ingredient: denso, quantity: 200 }]); // 1800 kcal
    const window = makeRequirement({
      scope_type: "nutrient",
      scope_nutrient_column: "kcal_per_100",
      meal_id: meal.id,
      minimum: 550,
      maximum: 650,
      unit: "kcal",
      strictness: "mandatory",
    });

    const ctx = buildTestContext({
      date: "2026-08-01",
      ingredients: [denso],
      meals: [{ meal, candidates: [dish] }],
      requirements: [window],
    });

    const proposal = generateDayProposal(ctx, createSeededRandom("2026-08-01"));
    expect(proposal.meals[0]!.resolved).not.toBeNull();
  });

  it("el status de un requisito de meal refleja solo el aporte de la dish de ese meal", () => {
    const proteinaA = makeIngredient({ name: "Proteína A", protein_g_per_100: 50 });
    const proteinaB = makeIngredient({ name: "Proteína B", protein_g_per_100: 50 });
    const mealA = makeMeal({ name: "Meal A" });
    const mealB = makeMeal({ name: "Meal B" });
    const dishA = makeCandidate(mealA.id, [{ ingredient: proteinaA, quantity: 100 }]); // 50 g
    const dishB = makeCandidate(mealB.id, [{ ingredient: proteinaB, quantity: 200 }]); // 100 g
    const windowA = makeRequirement({
      scope_type: "nutrient",
      scope_nutrient_column: "protein_g_per_100",
      meal_id: mealA.id,
      minimum: 25,
      maximum: 60,
      unit: "g",
    });

    const ctx = buildTestContext({
      date: "2026-08-01",
      ingredients: [proteinaA, proteinaB],
      meals: [
        { meal: mealA, candidates: [dishA] },
        { meal: mealB, candidates: [dishB] },
      ],
      requirements: [windowA],
    });

    const proposal = generateDayProposal(ctx, createSeededRandom("2026-08-01"));
    const status = proposal.requirementStatuses[0]!;
    expect(status.accumulated).toBe(50); // solo la dish del meal A, no los 100 g del meal B
    expect(status.withinRange).toBe(true);
  });

  it("marca el meal sin candidatas cuando no hay ninguna dish asociada", () => {
    const meal = makeMeal({ name: "Meal vacío" });
    const ctx = buildTestContext({
      date: "2026-08-01",
      ingredients: [],
      meals: [{ meal, candidates: [] }],
    });

    const proposal = generateDayProposal(ctx, createSeededRandom("2026-08-01"));
    const mealProposal = proposal.meals[0]!;
    expect(mealProposal.resolved).toBeNull();
    expect(mealProposal.unresolvedReason).toMatch(/No hay ninguna dish/);
  });
});
