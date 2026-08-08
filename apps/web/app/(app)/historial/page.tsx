import { fetchHistoryRange, pastDates } from "@meal-pilot/core";
import { IconHistory } from "@tabler/icons-react";
import { createClient } from "@/lib/supabase/server";
import { HistoryList } from "@/components/HistoryList";

/**
 * Ventana mostrada en /historial (ADR-0022): más amplia que el repaso
 * guiado (PLANNING_HORIZON_DAYS, solo lo urgente para el inventario) --
 * aquí se puede consultar y editar cualquier día pasado dentro de las
 * últimas dos semanas.
 */
const HISTORY_DAYS = 14;

export default async function HistorialPage() {
  const supabase = await createClient();
  const dates = pastDates(HISTORY_DAYS); // más antiguo primero
  const days = await fetchHistoryRange(supabase, dates);
  const daysMostRecentFirst = [...days].reverse();

  return (
    <div>
      <h2 className="section-title">
        <IconHistory size={16} stroke={2} /> Historial
      </h2>
      <p className="section-note">Lo comprometido frente a lo que realmente comiste, editable.</p>
      <HistoryList days={daysMostRecentFirst} />
    </div>
  );
}
