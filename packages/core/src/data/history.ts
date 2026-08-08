import type { SupabaseClient } from "@supabase/supabase-js";
import type { Meal } from "../engine/types.js";
import type { Database } from "./database.types.js";
import { formatLocalDate, PLANNING_HORIZON_DAYS } from "./multiDay.js";
import { RequestCache } from "./requestCache.js";

/**
 * Los cuatro estados de un slot (date, meal_id) según ADR-0022:
 * - unanswered: no hay fila en meal_log -- ni preguntado ni respondido.
 * - followed_plan: confirmed=true, dish_name (el plato comprometido u otro).
 * - ate_out: confirmed=true, description, sin dish_name.
 * - denied: confirmed=false -- fila explícita, distinta de "unanswered".
 */
export type MealLogState = "unanswered" | "followed_plan" | "ate_out" | "denied";

export interface HistoryMealEntry {
  meal: Meal;
  plannedDishId: string | null;
  plannedDishName: string | null;
  plannedUnresolvedReason: string | null;
  state: MealLogState;
  loggedDishName: string | null;
  loggedDescription: string | null;
}

export interface HistoryDay {
  date: string;
  meals: HistoryMealEntry[];
}

function keyOf(date: string, mealId: string): string {
  return `${date}::${mealId}`;
}

/** YYYY-MM-DD de los `days` anteriores a hoy (huso horario local), sin incluir hoy -- más antiguo primero. */
export function pastDates(days: number, from: Date = new Date()): string[] {
  const dates: string[] = [];
  for (let i = days; i >= 1; i--) {
    const d = new Date(from);
    d.setDate(d.getDate() - i);
    dates.push(formatLocalDate(d));
  }
  return dates;
}

/** Compromiso (planned_meal) vs hecho (meal_log) para cada fecha de `dates`, uno por meal. */
export async function fetchHistoryRange(
  supabase: SupabaseClient<Database>,
  dates: readonly string[],
  cache: RequestCache = new RequestCache(),
): Promise<HistoryDay[]> {
  if (dates.length === 0) return [];
  const sorted = [...dates].sort();
  const startDate = sorted[0]!;
  const endDate = sorted[sorted.length - 1]!;

  const [
    { data: mealsRaw, error: mealsError },
    { data: plannedRows, error: plannedError },
    { data: mealLogRows, error: mealLogError },
  ] = await Promise.all([
    cache.get("meal:all", () => supabase.from("meal").select("*").order("usual_start_time")),
    supabase.from("planned_meal").select("*").gte("date", startDate).lte("date", endDate),
    supabase.from("meal_log").select("*").gte("date", startDate).lte("date", endDate),
  ]);

  for (const [name, error] of Object.entries({ mealsError, plannedError, mealLogError })) {
    if (error) throw new Error(`fetchHistoryRange: fallo consultando ${name}: ${error.message}`);
  }

  const meals = mealsRaw ?? [];
  const plannedByKey = new Map((plannedRows ?? []).map((r) => [keyOf(r.date, r.meal_id), r]));
  const mealLogByKey = new Map((mealLogRows ?? []).map((r) => [keyOf(r.date, r.meal_id), r]));

  return dates.map((date) => ({
    date,
    meals: meals.map((meal) => {
      const key = keyOf(date, meal.id);
      const planned = plannedByKey.get(key);
      const log = mealLogByKey.get(key);

      let state: MealLogState = "unanswered";
      if (log) {
        if (!log.confirmed) state = "denied";
        else if (log.description) state = "ate_out";
        else state = "followed_plan";
      }

      return {
        meal,
        plannedDishId: planned?.dish_id ?? null,
        plannedDishName: planned?.dish_name ?? null,
        plannedUnresolvedReason: planned?.unresolved_reason ?? null,
        state,
        loggedDishName: log?.dish_name ?? null,
        loggedDescription: log?.description ?? null,
      };
    }),
  }));
}

/** Escribe cualquiera de los cuatro estados vía la función set_meal_log_state (ADR-0022). */
export async function setMealLogState(
  supabase: SupabaseClient<Database>,
  params: {
    date: string;
    mealId: string;
    state: MealLogState;
    dishId?: string;
    description?: string;
  },
): Promise<void> {
  const { error } = await supabase.rpc("set_meal_log_state", {
    p_date: params.date,
    p_meal_id: params.mealId,
    p_state: params.state,
    p_dish_id: params.dishId,
    p_description: params.description,
  });
  if (error) {
    throw new Error(`setMealLogState: fallo en set_meal_log_state: ${error.message}`);
  }
}

export interface PendingReviewItem {
  date: string;
  meal: Meal;
  dishId: string;
  dishName: string;
}

/**
 * Slots "sin responder" con candidata resuelta dentro de los últimos
 * PLANNING_HORIZON_DAYS días (ADR-0022: backlog acotado, más atrás la
 * corrección de inventario ya es irrelevante) -- lo que el repaso guiado
 * de "Hoy" pregunta uno a uno. Más antiguo primero.
 */
export async function fetchPendingReviewItems(
  supabase: SupabaseClient<Database>,
  cache: RequestCache = new RequestCache(),
): Promise<PendingReviewItem[]> {
  const dates = pastDates(PLANNING_HORIZON_DAYS);
  const days = await fetchHistoryRange(supabase, dates, cache);

  const items: PendingReviewItem[] = [];
  for (const day of days) {
    for (const entry of day.meals) {
      if (entry.state === "unanswered" && entry.plannedDishId && entry.plannedDishName) {
        items.push({
          date: day.date,
          meal: entry.meal,
          dishId: entry.plannedDishId,
          dishName: entry.plannedDishName,
        });
      }
    }
  }
  return items;
}
