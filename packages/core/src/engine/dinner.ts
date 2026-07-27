import type { DietaryRequirement, RequirementStatus } from "./types.js";

/**
 * Lo que la cena debe aportar para cerrar un requisito global diario
 * (ADR-0017, "Prepara tu cena"): el residuo entre el objetivo de día
 * completo y lo acumulado por los 4 meals diurnos. La cena queda fuera de
 * alcance (ADR-0001) — esto solo informa del objetivo, no la planifica.
 */
export interface DinnerTarget {
  requirement: DietaryRequirement;
  /** Lo que falta para el mínimo diario (0 = ya cubierto; null = sin mínimo). */
  remainingMinimum: number | null;
  /** Margen restante hasta el máximo diario (negativo = ya superado; null = sin máximo). */
  remainingMaximum: number | null;
  /** true si el mínimo (si lo hay) ya quedó cubierto por los meals diurnos. */
  covered: boolean;
}

/**
 * Residuos de cena a partir de los statuses de un `DayProposal`. Usa los
 * objetivos reales (minimum/maximum), no los márgenes de tolerancia: la
 * tolerancia es holgura del generador, no del objetivo del día.
 */
export function computeDinnerTargets(
  statuses: readonly RequirementStatus[],
): DinnerTarget[] {
  return statuses
    .filter(
      (status) =>
        status.requirement.meal_id === null && status.requirement.period === "day",
    )
    .map((status) => {
      const { minimum, maximum } = status.requirement;
      const remainingMinimum =
        minimum == null ? null : Math.max(minimum - status.accumulated, 0);
      const remainingMaximum = maximum == null ? null : maximum - status.accumulated;
      return {
        requirement: status.requirement,
        remainingMinimum,
        remainingMaximum,
        covered: minimum != null && remainingMinimum === 0,
      };
    });
}
