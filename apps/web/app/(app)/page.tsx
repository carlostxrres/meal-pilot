import { createSeededRandom, fetchDailyContext, generateDayProposal, upcomingDates } from "@meal-pilot/core";
import { createClient } from "@/lib/supabase/server";
import { DayTabs, type DayTabData } from "@/components/DayTabs";

const DAY_LABELS = ["Hoy", "Mañana"];

export default async function HomePage() {
  const supabase = await createClient();
  const dates = upcomingDates(2);

  const days: DayTabData[] = await Promise.all(
    dates.map(async (date, i) => {
      const ctx = await fetchDailyContext(supabase, date);
      const proposal = generateDayProposal(ctx, createSeededRandom(date));
      return {
        date,
        label: DAY_LABELS[i] ?? date,
        proposal,
        confirmedMealIds: ctx.confirmedMealIds,
        isToday: i === 0,
      };
    }),
  );

  return <DayTabs days={days} />;
}
