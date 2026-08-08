import {
  ensureCommittedPlan,
  fetchMealTips,
  fetchPendingReviewItems,
  PLANNING_HORIZON_DAYS,
  RequestCache,
  upcomingDates,
} from "@meal-pilot/core";
import { createClient } from "@/lib/supabase/server";
import { DayTabs, type DayTabData } from "@/components/DayTabs";
import { GuidedReview } from "@/components/GuidedReview";
import { formatFriendlyDate } from "@/lib/friendlyDate";

export default async function HomePage() {
  const supabase = await createClient();
  const dates = upcomingDates(PLANNING_HORIZON_DAYS);
  const cache = new RequestCache();

  // ADR-0019: el plan es un compromiso persistido -- ensureCommittedPlan
  // rellena perezosamente los huecos del horizonte y siempre devuelve lo
  // leído de planned_meal, nunca lo generado en memoria. `confirmedMealIds`
  // y los requisitos por meal no vienen de ahí (DayProposal no los lleva),
  // así que se piden aparte; comparten `cache` con la consulta interna de
  // dietary_requirement que ya hace ensureCommittedPlan. pendingReviewItems
  // (ADR-0022) es el repaso guiado de días anteriores sin responder.
  const [
    proposals,
    tipsByMeal,
    { data: requirementsData, error: requirementsError },
    { data: mealLogRows, error: mealLogError },
    pendingReviewItems,
  ] = await Promise.all([
    ensureCommittedPlan(supabase, dates, cache),
    fetchMealTips(supabase),
    cache.get("dietary_requirement:all", () => supabase.from("dietary_requirement").select("*")),
    supabase.from("meal_log").select("date, meal_id").eq("confirmed", true).in("date", dates),
    fetchPendingReviewItems(supabase, cache),
  ]);
  if (requirementsError) throw new Error(requirementsError.message);
  if (mealLogError) throw new Error(mealLogError.message);

  const mealRequirements = (requirementsData ?? []).filter((r) => r.meal_id != null);

  const confirmedMealIdsByDate = new Map<string, Set<string>>(dates.map((date) => [date, new Set()]));
  for (const log of mealLogRows ?? []) {
    confirmedMealIdsByDate.get(log.date)?.add(log.meal_id);
  }

  const days: DayTabData[] = proposals.map((proposal, i) => ({
    date: proposal.date,
    label: formatFriendlyDate(proposal.date, dates[0] ?? proposal.date),
    proposal,
    confirmedMealIds: confirmedMealIdsByDate.get(proposal.date) ?? new Set(),
    isToday: i === 0,
  }));

  return (
    <>
      <GuidedReview items={pendingReviewItems} />
      <DayTabs days={days} tipsByMeal={tipsByMeal} mealRequirements={mealRequirements} />
    </>
  );
}
