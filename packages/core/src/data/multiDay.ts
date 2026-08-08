import type { SupabaseClient } from "@supabase/supabase-js";
import { createSeededRandom } from "../engine/random.js";
import { generateMultiDayPlan } from "../engine/resolve.js";
import type { DailyContext, DayProposal } from "../engine/types.js";
import { fetchDailyContext } from "./fetchDailyContext.js";
import { RequestCache } from "./requestCache.js";
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
  cache: RequestCache = new RequestCache(),
): Promise<DayProposal[]> {
  const contexts = await fetchContextsForDates(supabase, dates, cache);
  return generateMultiDayPlan(contexts, createSeededRandom(dates[0] ?? ""));
}

/**
 * Como `generateProposalsForDates`, pero también devuelve los `DailyContext`
 * (ej. para `confirmedMealIds`). `cache` se comparte entre las llamadas a
 * `fetchDailyContext` de cada fecha (evita repetir `ingredient`/
 * `dietary_requirement`, que no varían por fecha) y, si el caller lo pasa,
 * con otras funciones de la misma página que pidan esas mismas tablas.
 */
export async function fetchContextsForDates(
  supabase: SupabaseClient<Database>,
  dates: readonly string[],
  cache: RequestCache = new RequestCache(),
): Promise<DailyContext[]> {
  return Promise.all(dates.map((date) => fetchDailyContext(supabase, date, cache)));
}

/**
 * Formatea una fecha en YYYY-MM-DD usando sus componentes en huso horario
 * local, no UTC. `toISOString()` siempre convierte a UTC, así que aplicado a
 * un instante local (`new Date()`) desplaza la fecha en Europe/Madrid entre
 * medianoche y la 01:00/02:00 — "hoy" se leía como "ayer". Con el plan
 * comprometido (ADR-0019) ese desplazamiento comprometería el día
 * equivocado, no solo lo mostraría mal.
 */
export function formatLocalDate(d: Date): string {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

/** YYYY-MM-DD de hoy (huso horario local) + los siguientes `days - 1` días (incluye hoy). */
export function upcomingDates(days: number, from: Date = new Date()): string[] {
  const dates: string[] = [];
  for (let i = 0; i < days; i++) {
    const d = new Date(from);
    d.setDate(d.getDate() + i);
    dates.push(formatLocalDate(d));
  }
  return dates;
}
