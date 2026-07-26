import { createSeededRandom, fetchDailyContext, generateDayProposal } from "@comida-diaria/core";
import { createClient } from "@/lib/supabase/server";
import { DayProposalView } from "@/components/DayProposalView";

export default async function HomePage() {
  const supabase = await createClient();
  const date = new Date().toISOString().slice(0, 10);
  const ctx = await fetchDailyContext(supabase, date);
  const proposal = generateDayProposal(ctx, createSeededRandom(date));

  return <DayProposalView proposal={proposal} confirmedMealIds={ctx.confirmedMealIds} />;
}
