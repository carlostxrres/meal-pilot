import { computeMealNutrition } from "./nutrition.js";
import { effectiveBounds } from "./resolve.js";
import type {
  DietaryRequirement,
  NutrientColumn,
  ResolvedDish,
} from "./types.js";

/** Un nutriente de la dish comparado contra la ventana de su meal. */
export interface DishComplianceCheck {
  requirement: DietaryRequirement;
  /** Aporte total de la dish para ese nutriente. */
  value: number;
  effectiveMinimum: number | null;
  effectiveMaximum: number | null;
  withinWindow: boolean;
}

export interface DishCompliance {
  checks: DishComplianceCheck[];
  /** true si todos los nutrientes de la ventana del meal caen dentro de margen. */
  compliant: boolean;
}

/**
 * Garantía del ADR-0018: "toda dish satisface los requisitos de su meal" se
 * valida sobre el perfil nutricional estático de la dish (es fija), no en
 * generación. Compara la dish contra los requisitos nutricionales ligados a
 * su meal (ADR-0017), usando los mismos márgenes de tolerancia del motor.
 */
export function checkDishCompliance(
  resolved: ResolvedDish,
  requirements: readonly DietaryRequirement[],
): DishCompliance {
  const totals = computeMealNutrition(resolved);

  const checks = requirements
    .filter(
      (req) =>
        req.meal_id === resolved.dish.meal_id &&
        req.scope_type === "nutrient" &&
        req.scope_nutrient_column !== null,
    )
    .map((requirement) => {
      const value = totals[requirement.scope_nutrient_column as NutrientColumn] ?? 0;
      const { effectiveMinimum, effectiveMaximum } = effectiveBounds(requirement);
      const withinWindow =
        (effectiveMinimum == null || value >= effectiveMinimum) &&
        (effectiveMaximum == null || value <= effectiveMaximum);
      return { requirement, value, effectiveMinimum, effectiveMaximum, withinWindow };
    });

  return { checks, compliant: checks.every((c) => c.withinWindow) };
}
