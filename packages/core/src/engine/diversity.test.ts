import { describe, expect, it } from "vitest";
import { getRecentlyUsedIngredientIds } from "./diversity.js";

describe("getRecentlyUsedIngredientIds", () => {
  it("incluye todos los ingredientes de slots resueltos dentro de la ventana", () => {
    const sources = [{ date: "2026-08-05", ingredientIds: ["ing-pollo", "ing-pan"] }];

    const recent = getRecentlyUsedIngredientIds(sources, "2026-08-07", 3);
    expect(recent.has("ing-pollo")).toBe(true);
    expect(recent.has("ing-pan")).toBe(true);
  });

  it("excluye registros anteriores a la ventana", () => {
    const sources = [{ date: "2026-08-01", ingredientIds: ["ing-pollo"] }];

    const recent = getRecentlyUsedIngredientIds(sources, "2026-08-07", 3);
    expect(recent.has("ing-pollo")).toBe(false);
  });

  it("un slot sin ingredientes (unresolved / no comido / comida de fuera) no aporta nada", () => {
    const sources = [{ date: "2026-08-06", ingredientIds: [] }];

    const recent = getRecentlyUsedIngredientIds(sources, "2026-08-07", 3);
    expect(recent.size).toBe(0);
  });

  it("sin fuentes (estado actual real, sin historial) no excluye nada", () => {
    const recent = getRecentlyUsedIngredientIds([], "2026-08-07", 3);
    expect(recent.size).toBe(0);
  });
});
