import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "./database.types.js";

/**
 * Confirma (o desconfirma) que un meal concreto se ha comido tal cual se
 * propuso, para una fecha dada. v1: sí/no únicamente, sin editar
 * desviaciones (ver docs/plans/2026-07-26-ui-design-system-and-ia.md).
 *
 * No hay UNIQUE(date, meal_id) en el esquema, así que se borra cualquier
 * fila previa de ese meal/fecha antes de (opcionalmente) insertar la nueva,
 * para evitar duplicados si se marca/desmarca varias veces.
 *
 * Limitación conocida: esto NO recalcula requirement_log todavía — el
 * acumulado que ve el usuario en "Hoy" sigue siendo el de la propuesta
 * generada, no el histórico de confirmaciones reales.
 */
export async function setMealConfirmed(
  supabase: SupabaseClient<Database>,
  params: { date: string; mealId: string; dishId: string; confirmed: boolean },
): Promise<void> {
  const { date, mealId, dishId, confirmed } = params;

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();
  if (userError || !user) {
    throw new Error("setMealConfirmed: no hay usuario autenticado");
  }

  const { error: deleteError } = await supabase
    .from("meal_log")
    .delete()
    .eq("date", date)
    .eq("meal_id", mealId);
  if (deleteError) {
    throw new Error(`setMealConfirmed: fallo borrando meal_log previo: ${deleteError.message}`);
  }

  if (!confirmed) return;

  const { error: insertError } = await supabase.from("meal_log").insert({
    owner_id: user.id,
    date,
    meal_id: mealId,
    dish_id: dishId,
    confirmed: true,
  });
  if (insertError) {
    throw new Error(`setMealConfirmed: fallo insertando meal_log: ${insertError.message}`);
  }
}
