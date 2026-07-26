import { describe, expect, it } from "vitest";
import { computeShoppingList } from "./shoppingList.js";
import { makeDish, makeIngredient, makeMeal, makeRequirement } from "./testFixtures.js";
import type { DayProposal } from "./types.js";

function makeProposal(date: string, ingredient: ReturnType<typeof makeIngredient>, quantity: number): DayProposal {
  const meal = makeMeal();
  const dish = makeDish();
  return {
    date,
    meals: [
      {
        meal,
        supplements: [],
        resolved: { dish, components: [{ ingredient, quantity }] },
        unresolvedReason: null,
      },
    ],
    requirementStatuses: [],
  };
}

describe("computeShoppingList", () => {
  it("incluye un ingrediente cuya necesidad de las próximas propuestas supera el stock", () => {
    const pan = makeIngredient({ name: "Pan", office_inventory: 30, home_inventory: 0 });
    const proposals = [makeProposal("2026-08-01", pan, 100)];

    const list = computeShoppingList([pan], [], proposals);

    expect(list).toHaveLength(1);
    expect(list[0]!.reasons).toEqual(["upcoming_need"]);
    expect(list[0]!.restockQuantity).toBe(70);
  });

  it("no incluye nada si el stock ya cubre la necesidad de los próximos días", () => {
    const pan = makeIngredient({ office_inventory: 500, home_inventory: 0 });
    const proposals = [makeProposal("2026-08-01", pan, 100)];

    expect(computeShoppingList([pan], [], proposals)).toEqual([]);
  });

  it("suma la necesidad a través de varios días", () => {
    const pan = makeIngredient({ office_inventory: 0, home_inventory: 0 });
    const proposals = [makeProposal("2026-08-01", pan, 100), makeProposal("2026-08-02", pan, 100)];

    const list = computeShoppingList([pan], [], proposals);
    expect(list[0]!.restockQuantity).toBe(200);
  });

  it("incluye un ingrediente por debajo del mínimo de un requisito mandatory, sin necesitar propuestas", () => {
    const sardinas = makeIngredient({ name: "Sardinas en lata", office_inventory: 50, home_inventory: 0 });
    const requirement = makeRequirement({
      scope_type: "ingredient",
      scope_ingredient_id: sardinas.id,
      minimum: 240,
      strictness: "mandatory",
    });

    const list = computeShoppingList([sardinas], [requirement], []);

    expect(list).toHaveLength(1);
    expect(list[0]!.reasons).toEqual(["requirement"]);
  });

  it("combina ambos motivos sin duplicar la fila", () => {
    const atun = makeIngredient({ name: "Atún en lata", office_inventory: 0, home_inventory: 0 });
    const requirement = makeRequirement({
      scope_type: "ingredient",
      scope_ingredient_id: atun.id,
      minimum: 100,
      strictness: "mandatory",
    });
    const proposals = [makeProposal("2026-08-01", atun, 50)];

    const list = computeShoppingList([atun], [requirement], proposals);

    expect(list).toHaveLength(1);
    expect(list[0]!.reasons.sort()).toEqual(["requirement", "upcoming_need"]);
  });

  it("no incluye un requisito advisory ni de tipo nutriente", () => {
    const ingrediente = makeIngredient({ office_inventory: 0, home_inventory: 0 });
    const advisory = makeRequirement({
      scope_type: "ingredient",
      scope_ingredient_id: ingrediente.id,
      minimum: 100,
      strictness: "advisory",
    });

    expect(computeShoppingList([ingrediente], [advisory], [])).toEqual([]);
  });
});
