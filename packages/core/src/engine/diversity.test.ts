import { describe, expect, it } from "vitest";
import { getRecentlyUsedIngredientIds } from "./diversity.js";
import { makeDishIngredient } from "./testFixtures.js";
import type { MealLog } from "./types.js";

function makeMealLog(overrides: Partial<MealLog>): MealLog {
  return {
    id: "log-1",
    owner_id: "owner-1",
    date: "2026-08-01",
    meal_id: "meal-1",
    dish_id: "dish-1",
    confirmed: true,
    ...overrides,
  };
}

describe("getRecentlyUsedIngredientIds", () => {
  it("incluye todos los componentes de dishes servidas dentro de la ventana", () => {
    const dishIngredientsByDishId = new Map([
      [
        "dish-1",
        [
          makeDishIngredient({ dish_id: "dish-1", ingredient_id: "ing-pollo" }),
          makeDishIngredient({ dish_id: "dish-1", ingredient_id: "ing-pan" }),
        ],
      ],
    ]);
    const logs = [makeMealLog({ date: "2026-08-05", dish_id: "dish-1" })];

    const recent = getRecentlyUsedIngredientIds(logs, dishIngredientsByDishId, "2026-08-07", 3);
    expect(recent.has("ing-pollo")).toBe(true);
    expect(recent.has("ing-pan")).toBe(true);
  });

  it("excluye registros anteriores a la ventana", () => {
    const dishIngredientsByDishId = new Map([
      ["dish-1", [makeDishIngredient({ dish_id: "dish-1", ingredient_id: "ing-pollo" })]],
    ]);
    const logs = [makeMealLog({ date: "2026-08-01", dish_id: "dish-1" })];

    const recent = getRecentlyUsedIngredientIds(logs, dishIngredientsByDishId, "2026-08-07", 3);
    expect(recent.has("ing-pollo")).toBe(false);
  });

  it("con meal_log vacío (estado actual real) no excluye nada", () => {
    const recent = getRecentlyUsedIngredientIds([], new Map(), "2026-08-07", 3);
    expect(recent.size).toBe(0);
  });
});
