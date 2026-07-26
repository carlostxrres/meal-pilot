import type { SupabaseClient } from "@supabase/supabase-js";
import { createSeededRandom } from "../engine/random.js";
import { generateMultiDayPlan } from "../engine/resolve.js";
import type { DailyContext, DayProposal } from "../engine/types.js";
import { fetchDailyContext } from "./fetchDailyContext.js";
import type { Database } from "./database.types.js";

/** Horizonte de planificación por defecto: hoy + los siguientes días, encadenados. */
export const PLANNING_HORIZON_DAYS = 3;

/**
 * Recupera el contexto de varias fechas y genera un plan encadenado
 * (`generateMultiDayPlan`) — la diversidad y los requisitos semanales se
 * arrastran entre días, no se genera cada uno de forma aislada. Se usa
 * tanto para el selector de días en "Hoy" como para calcular la lista de
 * la compra de los próximos días en "Compra": ambas vistas deben usar
 * exactamente el mismo plan, no recalcularlo cada una por su lado.
 */
export async function generateProposalsForDates(
  supabase: SupabaseClient<Database>,
  dates: readonly string[],
): Promise<DayProposal[]> {
  const contexts = await fetchContextsForDates(supabase, dates);
  return generateMultiDayPlan(contexts, createSeededRandom(dates[0] ?? ""));
}

/** Como `generateProposalsForDates`, pero también devuelve los `DailyContext` (ej. para `confirmedMealIds`). */
export async function fetchContextsForDates(
  supabase: SupabaseClient<Database>,
  dates: readonly string[],
): Promise<DailyContext[]> {
  return Promise.all(dates.map((date) => fetchDailyContext(supabase, date)));
}

/** YYYY-MM-DD de hoy + los siguientes `days - 1` días (incluye hoy). */
export function upcomingDates(days: number, from: Date = new Date()): string[] {
  const dates: string[] = [];
  for (let i = 0; i < days; i++) {
    const d = new Date(from);
    d.setUTCDate(d.getUTCDate() + i);
    dates.push(d.toISOString().slice(0, 10));
  }
  return dates;
}
