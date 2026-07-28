import { describe, expect, it } from "vitest";
import { suggestForNutrient } from "./suggestions.js";
import { makeIngredient, makeRequirement } from "./testFixtures.js";

const proteinWindow = (overrides = {}) =>
  makeRequirement({
    scope_type: "nutrient",
    scope_nutrient_column: "protein_g_per_100",
    meal_id: "meal-1",
    minimum: 25,
    maximum: 32,
    unit: "g",
    tolerance_margin: 0,
    ...overrides,
  });

const satFatWindow = (overrides = {}) =>
  makeRequirement({
    scope_type: "nutrient",
    scope_nutrient_column: "saturated_fat_g_per_100",
    meal_id: "meal-1",
    maximum: 5,
    unit: "g",
    tolerance_margin: 0,
    ...overrides,
  });

describe("suggestForNutrient", () => {
  it("dentro de la ventana: status within y sin sugerencias", () => {
    const pollo = makeIngredient({ name: "Pollo", protein_g_per_100: 30 });
    const result = suggestForNutrient(
      [{ ingredient: pollo, quantity: 100 }], // 30 g de proteína, dentro de 25–32
      proteinWindow(),
      [proteinWindow()],
      [pollo],
    );
    expect(result.status).toBe("within");
    expect(result.suggestions).toHaveLength(0);
  });

  it("por debajo: sugiere añadir la cantidad que alcanza el mínimo, redondeada", () => {
    const pollo = makeIngredient({ name: "Pollo", protein_g_per_100: 30 });
    const requirement = proteinWindow();
    const result = suggestForNutrient([], requirement, [requirement], [pollo]);

    expect(result.status).toBe("below");
    expect(result.suggestions).toHaveLength(1);
    const s = result.suggestions[0]!;
    expect(s.kind).toBe("add");
    // 25 g / (30 g/100g) = 83.3 g -> múltiplo de 5 hacia arriba = 85 g
    expect(s.quantity).toBe(85);
  });

  it("por debajo: prioriza el ingrediente que no estropea otros nutrientes de la ventana", () => {
    const pollo = makeIngredient({ name: "Pollo", protein_g_per_100: 30, saturated_fat_g_per_100: 1 });
    const queso = makeIngredient({ name: "Queso curado", protein_g_per_100: 25, saturated_fat_g_per_100: 20 });
    const requirement = proteinWindow();
    const result = suggestForNutrient(
      [],
      requirement,
      [requirement, satFatWindow()],
      [queso, pollo], // orden del catálogo adverso a propósito
    );

    // El queso llevaría la saturada a ~20g (techo 5g); el pollo apenas la mueve.
    expect(result.suggestions.map((s) => s.ingredient.name)).toEqual(["Pollo", "Queso curado"]);
  });

  it("por debajo: descarta sugerencias que arreglarían el mínimo pasándose del máximo", () => {
    const concentrado = makeIngredient({ name: "Concentrado", protein_g_per_100: 30 });
    // Ventana estrechísima: alcanzar 25 en saltos de 5g de un ingrediente de
    // densidad 30 obliga a 85g -> 25.5g... dentro. Usamos un caso que se pasa:
    const requirement = proteinWindow({ minimum: 25, maximum: 25.2 });
    const result = suggestForNutrient([], requirement, [requirement], [concentrado]);
    expect(result.status).toBe("below");
    expect(result.suggestions).toHaveLength(0); // 85g -> 25.5 > 25.2, descartada
  });

  it("por encima: sugiere reducir de los ingredientes ya añadidos, sin pasarse de lo disponible", () => {
    const salmon = makeIngredient({ name: "Salmón", fat_g_per_100: 13 });
    const fatWindow = makeRequirement({
      scope_type: "nutrient",
      scope_nutrient_column: "fat_g_per_100",
      meal_id: "meal-1",
      minimum: 3,
      maximum: 8,
      unit: "g",
      tolerance_margin: 0,
    });
    const result = suggestForNutrient(
      [{ ingredient: salmon, quantity: 200 }], // 26 g de grasa, techo 8
      fatWindow,
      [fatWindow],
      [salmon],
    );

    expect(result.status).toBe("above");
    const s = result.suggestions[0]!;
    expect(s.kind).toBe("reduce");
    // (26-8)/13*100 = 138.5 -> 140, y 26 - 140*0.13 = 7.8 <= 8
    expect(s.quantity).toBe(140);
  });

  it("por encima: si no hay suficiente cantidad, propone quitar todo lo disponible", () => {
    const salmon = makeIngredient({ name: "Salmón", fat_g_per_100: 13 });
    const otro = makeIngredient({ name: "Aceituna", fat_g_per_100: 15 });
    const fatWindow = makeRequirement({
      scope_type: "nutrient",
      scope_nutrient_column: "fat_g_per_100",
      meal_id: "meal-1",
      maximum: 8,
      unit: "g",
      tolerance_margin: 0,
    });
    const result = suggestForNutrient(
      [
        { ingredient: salmon, quantity: 50 }, // 6.5 g
        { ingredient: otro, quantity: 100 }, // 15 g -> total 21.5
      ],
      fatWindow,
      [fatWindow],
      [salmon, otro],
    );

    // La aceituna sola puede arreglarlo (quitar 90 -> 21.5-13.5 = 8); el salmón
    // entero solo baja 6.5. La que arregla va primero.
    expect(result.suggestions[0]!.ingredient.name).toBe("Aceituna");
    const salmonSuggestion = result.suggestions.find((s) => s.ingredient.name === "Salmón")!;
    expect(salmonSuggestion.quantity).toBe(50); // capado a lo disponible
  });

  it("ingredientes en unidades: cantidades enteras", () => {
    const huevo = makeIngredient({ name: "Huevo", base_unit: "unit", protein_g_per_100: 1300 });
    // protein por 100 unidades = 1300 -> 13 g/unidad
    const requirement = proteinWindow({ maximum: null });
    const result = suggestForNutrient([], requirement, [requirement], [huevo]);
    const s = result.suggestions[0]!;
    expect(s.quantity).toBe(2); // 25/13 = 1.92 -> 2 unidades
  });
});
