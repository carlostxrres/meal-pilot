import { createSeededRandom, pickRandom } from "./random.js";
import type { MealTip } from "./types.js";

/**
 * Elige un consejo al azar para `mealId` en `date`, con semilla propia
 * (fecha + meal) para que sea estable durante ese día (no cambia al
 * cambiar de pestaña o recargar) pero pueda variar de un día a otro, igual
 * que el resto de aleatoriedad "por fecha" del motor (ver random.ts).
 */
export function pickDailyTip(
  tipsByMeal: ReadonlyMap<string, MealTip[]>,
  mealId: string,
  date: string,
): MealTip | null {
  const tips = tipsByMeal.get(mealId);
  if (!tips || tips.length === 0) return null;
  return pickRandom(tips, createSeededRandom(`${date}:${mealId}`));
}
