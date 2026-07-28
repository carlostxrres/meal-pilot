import { describe, expect, it } from "vitest";
import { computeHomeToOfficeCarry, computeOfficeToStreetGrab } from "./commute.js";
import { makeDish, makeIngredient, makeMeal } from "./testFixtures.js";
import type { DayProposal, MealProposal, ResolvedDish } from "./types.js";

function resolvedOf(mealId: string, parts: { ingredient: ReturnType<typeof makeIngredient>; quantity: number }[]): ResolvedDish {
  return { dish: makeDish({ meal_id: mealId }), components: parts };
}

function proposalOf(meals: { meal: ReturnType<typeof makeMeal>; resolved: ResolvedDish | null }[]): DayProposal {
  const mealProposals: MealProposal[] = meals.map((m) => ({
    meal: m.meal,
    supplements: [],
    resolved: m.resolved,
    unresolvedReason: m.resolved ? null : "sin propuesta",
  }));
  return { date: "2026-08-01", meals: mealProposals, requirementStatuses: [] };
}

describe("computeHomeToOfficeCarry", () => {
  it("ignora el desayuno (primer meal) aunque use ingredientes solo disponibles en casa", () => {
    const leche = makeIngredient({ name: "Leche", office_inventory: 0, home_inventory: 500 });
    const desayuno = makeMeal({ name: "Desayuno en casa" });
    const proposal = proposalOf([
      { meal: desayuno, resolved: resolvedOf(desayuno.id, [{ ingredient: leche, quantity: 150 }]) },
    ]);
    expect(computeHomeToOfficeCarry(proposal)).toHaveLength(0);
  });

  it("lista los ingredientes de otros meals cuya cantidad no cubre el stock de oficina", () => {
    const salmon = makeIngredient({ name: "Salmón", office_inventory: 0, home_inventory: 300 });
    const cuscus = makeIngredient({ name: "Cous cous", office_inventory: 20, home_inventory: 200 });
    const desayuno = makeMeal({ name: "Desayuno en casa" });
    const almuerzo = makeMeal({ name: "Almuerzo de mediodia" });
    const proposal = proposalOf([
      { meal: desayuno, resolved: null },
      {
        meal: almuerzo,
        resolved: resolvedOf(almuerzo.id, [
          { ingredient: salmon, quantity: 160 }, // 0 en oficina -> llevar
          { ingredient: cuscus, quantity: 120 }, // 20 en oficina, insuficiente -> llevar
        ]),
      },
    ]);
    const result = computeHomeToOfficeCarry(proposal);
    expect(result).toHaveLength(1);
    expect(result[0]!.meal.id).toBe(almuerzo.id);
    expect(result[0]!.components.map((c) => c.ingredient.name)).toEqual(["Salmón", "Cous cous"]);
  });

  it("no lista un meal si todo lo que necesita ya está en la oficina", () => {
    const arroz = makeIngredient({ name: "Arroz", office_inventory: 500 });
    const almuerzo = makeMeal();
    const proposal = proposalOf([
      { meal: makeMeal(), resolved: null },
      { meal: almuerzo, resolved: resolvedOf(almuerzo.id, [{ ingredient: arroz, quantity: 150 }]) },
    ]);
    expect(computeHomeToOfficeCarry(proposal)).toHaveLength(0);
  });

  it("omite meals sin propuesta resuelta", () => {
    const proposal = proposalOf([
      { meal: makeMeal(), resolved: null },
      { meal: makeMeal(), resolved: null },
    ]);
    expect(computeHomeToOfficeCarry(proposal)).toHaveLength(0);
  });
});

describe("computeOfficeToStreetGrab", () => {
  it("solo considera el último meal del día", () => {
    const proteina = makeIngredient({ name: "Proteína en polvo", office_inventory: 200 });
    const postEntreno = makeMeal({ name: "Snack post-entreno" });
    const proposal = proposalOf([
      { meal: makeMeal(), resolved: null },
      { meal: postEntreno, resolved: resolvedOf(postEntreno.id, [{ ingredient: proteina, quantity: 30 }]) },
    ]);
    const result = computeOfficeToStreetGrab(proposal);
    expect(result?.meal.id).toBe(postEntreno.id);
    expect(result?.components.map((c) => c.ingredient.name)).toEqual(["Proteína en polvo"]);
  });

  it("excluye ingredientes que no están disponibles en oficina (esos ya se llevaron de casa)", () => {
    const isotonica = makeIngredient({ name: "Isotónica", office_inventory: 0 });
    const postEntreno = makeMeal();
    const proposal = proposalOf([
      { meal: postEntreno, resolved: resolvedOf(postEntreno.id, [{ ingredient: isotonica, quantity: 500 }]) },
    ]);
    expect(computeOfficeToStreetGrab(proposal)).toBeNull();
  });

  it("devuelve null si el último meal no tiene propuesta resuelta", () => {
    const proposal = proposalOf([{ meal: makeMeal(), resolved: null }]);
    expect(computeOfficeToStreetGrab(proposal)).toBeNull();
  });
});
