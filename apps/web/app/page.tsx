import { createSeededRandom, fetchDailyContext, generateDayProposal } from "@comida-diaria/core";
import { signOut } from "./login/actions";
import { createClient } from "@/lib/supabase/server";
import { DayProposalView } from "@/components/DayProposalView";

export default async function HomePage() {
  const supabase = await createClient();
  const date = new Date().toISOString().slice(0, 10);
  const ctx = await fetchDailyContext(supabase, date);
  const proposal = generateDayProposal(ctx, createSeededRandom(date));

  return (
    <main className="page">
      <header className="page-header">
        <h1>comida-diaria</h1>
        <form action={signOut}>
          <button type="submit" className="signout">
            Salir
          </button>
        </form>
      </header>
      <DayProposalView proposal={proposal} />
    </main>
  );
}
