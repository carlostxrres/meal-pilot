import { effectiveBounds } from "./resolve.js";
import type { DietaryRequirement, Ingredient } from "./types.js";

/** Un componente en edición (creador de dishes): ingrediente + cantidad actual. */
export interface DraftDishComponent {
  ingredient: Ingredient;
  quantity: number;
}

export interface DishSuggestion {
  kind: "add" | "reduce";
  ingredient: Ingredient;
  /** Cantidad (positiva, en base_unit del ingrediente) a añadir o quitar. */
  quantity: number;
}

export interface NutrientSuggestions {
  /** Posición del nutriente respecto a su ventana efectiva (con tolerancia). */
  status: "within" | "below" | "above";
  /** Vacío si status = within. Ordenadas de mejor a peor. */
  suggestions: DishSuggestion[];
}

const MAX_SUGGESTIONS = 6;
/** Cantidades absurdas fuera: nadie añade 700g de un ingrediente para cuadrar un nutriente. */
const MAX_ADD_GRAMS = 500;
const MAX_ADD_UNITS = 5;

function density(ingredient: Ingredient, requirement: DietaryRequirement): number {
  const column = requirement.scope_nutrient_column as keyof Ingredient | null;
  if (!column) return 0;
  const value = ingredient[column];
  return typeof value === "number" ? value : 0;
}

function nutrientTotal(
  components: readonly DraftDishComponent[],
  requirement: DietaryRequirement,
): number {
  return components.reduce(
    (sum, c) => sum + (density(c.ingredient, requirement) * c.quantity) / 100,
    0,
  );
}

/**
 * Cuánto se sale `value` de la ventana efectiva del requisito, normalizado por
 * la magnitud del objetivo para poder sumar penalizaciones de nutrientes con
 * unidades distintas (kcal, g, mg).
 */
function windowPenalty(value: number, requirement: DietaryRequirement): number {
  const { effectiveMinimum, effectiveMaximum } = effectiveBounds(requirement);
  const norm = requirement.minimum ?? requirement.maximum ?? 1;
  let penalty = 0;
  if (effectiveMinimum != null && value < effectiveMinimum) {
    penalty += (effectiveMinimum - value) / norm;
  }
  if (effectiveMaximum != null && value > effectiveMaximum) {
    penalty += (value - effectiveMaximum) / norm;
  }
  return penalty;
}

/** Redondeo a cantidades "humanas": múltiplos de 5 g/ml, unidades enteras. Siempre hacia arriba. */
function snapUp(raw: number, baseUnit: Ingredient["base_unit"]): number {
  if (baseUnit === "unit") return Math.max(1, Math.ceil(raw));
  return Math.max(5, Math.ceil(raw / 5) * 5);
}

/**
 * Sugerencias para llevar un nutriente de la dish en edición a su ventana
 * (ADR-0017). "Añadir" busca en todo el catálogo la cantidad que alcanza el
 * objetivo; "reducir" solo entre los ingredientes ya añadidos, sin quitar más
 * de lo que hay. En ambos casos se ordena por *cuánto empeora (o mejora) al
 * resto de nutrientes de la ventana del meal* — la mejor sugerencia es la que
 * arregla este nutriente estropeando lo mínimo los demás.
 */
export function suggestForNutrient(
  components: readonly DraftDishComponent[],
  requirement: DietaryRequirement,
  mealRequirements: readonly DietaryRequirement[],
  catalog: readonly Ingredient[],
): NutrientSuggestions {
  const value = nutrientTotal(components, requirement);
  const { effectiveMinimum, effectiveMaximum } = effectiveBounds(requirement);

  const others = mealRequirements.filter(
    (r) =>
      r.id !== requirement.id &&
      r.meal_id === requirement.meal_id &&
      r.scope_type === "nutrient" &&
      r.scope_nutrient_column !== null,
  );

  /** Efecto sobre los demás nutrientes de cambiar `ingredient` en `signedQuantity`. */
  const sideEffectScore = (ingredient: Ingredient, signedQuantity: number): number =>
    others.reduce((sum, req) => {
      const before = nutrientTotal(components, req);
      const after = before + (density(ingredient, req) * signedQuantity) / 100;
      return sum + (windowPenalty(after, req) - windowPenalty(before, req));
    }, 0);

  if (effectiveMinimum != null && value < effectiveMinimum) {
    const target = requirement.minimum!;
    const suggestions = catalog
      .flatMap((ingredient) => {
        const d = density(ingredient, requirement);
        if (d <= 0) return [];
        const quantity = snapUp(((target - value) / d) * 100, ingredient.base_unit);
        if (quantity > (ingredient.base_unit === "unit" ? MAX_ADD_UNITS : MAX_ADD_GRAMS)) return [];
        // Nunca sugerir pasarse del máximo recomendado del ingrediente en el
        // plato (ya tenga algo añadido o no, ver ingredient.max_quantity_per_dish).
        const existingQuantity = components.find((c) => c.ingredient.id === ingredient.id)?.quantity ?? 0;
        if (
          ingredient.max_quantity_per_dish != null &&
          existingQuantity + quantity > ingredient.max_quantity_per_dish
        ) {
          return [];
        }
        const after = value + (d * quantity) / 100;
        // No sugerir arreglar el mínimo pasándose del máximo.
        if (effectiveMaximum != null && after > effectiveMaximum) return [];
        return [{ ingredient, quantity, score: sideEffectScore(ingredient, quantity) }];
      })
      .sort((a, b) => a.score - b.score || a.quantity - b.quantity)
      .slice(0, MAX_SUGGESTIONS)
      .map(({ ingredient, quantity }) => ({ kind: "add" as const, ingredient, quantity }));
    return { status: "below", suggestions };
  }

  if (effectiveMaximum != null && value > effectiveMaximum) {
    const target = requirement.maximum!;
    const suggestions = components
      .flatMap(({ ingredient, quantity: available }) => {
        const d = density(ingredient, requirement);
        if (d <= 0) return [];
        const needed = ((value - target) / d) * 100;
        const quantity = Math.min(available, snapUp(needed, ingredient.base_unit));
        const after = value - (d * quantity) / 100;
        const fixes = effectiveMaximum == null || after <= effectiveMaximum;
        return [{ ingredient, quantity, fixes, score: sideEffectScore(ingredient, -quantity) }];
      })
      .sort(
        (a, b) =>
          Number(b.fixes) - Number(a.fixes) || a.score - b.score || a.quantity - b.quantity,
      )
      .slice(0, MAX_SUGGESTIONS)
      .map(({ ingredient, quantity }) => ({ kind: "reduce" as const, ingredient, quantity }));
    return { status: "above", suggestions };
  }

  return { status: "within", suggestions: [] };
}
