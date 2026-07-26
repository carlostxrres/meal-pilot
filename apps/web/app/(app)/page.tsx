import {
  createSeededRandom,
  fetchContextsForDates,
  generateMultiDayPlan,
  PLANNING_HORIZON_DAYS,
  upcomingDates,
} from "@meal-pilot/core";
import { createClient } from "@/lib/supabase/server";
import { DayTabs, type DayTabData } from "@/components/DayTabs";

const DAY_LABELS = ["Hoy", "Mañana", "Pasado mañana"];

export default async function HomePage() {
  const supabase = await createClient();
  const dates = upcomingDates(PLANNING_HORIZON_DAYS);

  const contexts = await fetchContextsForDates(supabase, dates);
  const proposals = generateMultiDayPlan(contexts, createSeededRandom(dates[0] ?? ""));

  const days: DayTabData[] = contexts.map((ctx, i) => ({
    date: ctx.date,
    label: DAY_LABELS[i] ?? ctx.date,
    proposal: proposals[i]!,
    confirmedMealIds: ctx.confirmedMealIds,
    isToday: i === 0,
  }));

  return <DayTabs days={days} />;
}
