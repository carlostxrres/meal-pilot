import {
  createSeededRandom,
  fetchContextsForDates,
  fetchMealTips,
  generateMultiDayPlan,
  PLANNING_HORIZON_DAYS,
  upcomingDates,
} from "@meal-pilot/core";
import { createClient } from "@/lib/supabase/server";
import { DayTabs, type DayTabData } from "@/components/DayTabs";
import { formatFriendlyDate } from "@/lib/friendlyDate";

export default async function HomePage() {
  const supabase = await createClient();
  const dates = upcomingDates(PLANNING_HORIZON_DAYS);

  const [contexts, tipsByMeal] = await Promise.all([
    fetchContextsForDates(supabase, dates),
    fetchMealTips(supabase),
  ]);
  const proposals = generateMultiDayPlan(contexts, createSeededRandom(dates[0] ?? ""));

  const days: DayTabData[] = contexts.map((ctx, i) => ({
    date: ctx.date,
    label: formatFriendlyDate(ctx.date, dates[0] ?? ctx.date),
    proposal: proposals[i]!,
    confirmedMealIds: ctx.confirmedMealIds,
    isToday: i === 0,
  }));

  return <DayTabs days={days} tipsByMeal={tipsByMeal} />;
}
