import { describe, expect, it } from "vitest";
import { computeShoppingList } from "./shoppingList.js";
import { makeIngredient, makeRequirement } from "./testFixtures.js";

describe("computeShoppingList", () => {
  it("incluye un ingrediente sin stock", () => {
    const sinStock = makeIngredient({ name: "Sin stock", office_inventory: 0, home_inventory: 0 });
    const conStock = makeIngredient({ name: "Con stock", office_inventory: 100, home_inventory: 0 });

    const list = computeShoppingList([sinStock, conStock], []);

    expect(list.map((i) => i.ingredient.name)).toEqual(["Sin stock"]);
    expect(list[0]!.reasons).toEqual(["out_of_stock"]);
  });

  it("incluye un ingrediente por debajo del mínimo de un requisito mandatory", () => {
    const sardinas = makeIngredient({ name: "Sardinas en lata", office_inventory: 50, home_inventory: 0 });
    const requirement = makeRequirement({
      scope_type: "ingredient",
      scope_ingredient_id: sardinas.id,
      minimum: 240,
      strictness: "mandatory",
    });

    const list = computeShoppingList([sardinas], [requirement]);

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

    const list = computeShoppingList([atun], [requirement]);

    expect(list).toHaveLength(1);
    expect(list[0]!.reasons.sort()).toEqual(["out_of_stock", "requirement"]);
  });

  it("no incluye un requisito advisory ni de tipo nutriente", () => {
    const ingrediente = makeIngredient({ office_inventory: 0, home_inventory: 0 });
    const advisory = makeRequirement({
      scope_type: "ingredient",
      scope_ingredient_id: ingrediente.id,
      minimum: 100,
      strictness: "advisory",
    });

    const list = computeShoppingList([ingrediente], [advisory]);

    // sigue apareciendo por "out_of_stock", pero no por "requirement"
    expect(list[0]!.reasons).toEqual(["out_of_stock"]);
  });

  it("no incluye nada si hay stock suficiente y ningún requisito pendiente", () => {
    const ok = makeIngredient({ office_inventory: 500, home_inventory: 0 });
    expect(computeShoppingList([ok], [])).toEqual([]);
  });
});
