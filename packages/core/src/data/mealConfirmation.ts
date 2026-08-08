import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "./database.types.js";

/**
 * Confirma (o desconfirma) que un meal concreto se ha comido tal cual se
 * propuso, para una fecha dada. v1: sí/no únicamente, sin editar
 * desviaciones (ver docs/plans/2026-07-26-ui-design-system-and-ia.md).
 *
 * ADR-0021: confirmar descuenta del inventario las cantidades congeladas en
 * planned_meal.components (clamp a 0); desconfirmar las devuelve. La
 * escritura en meal_log y el descuento van en la función SQL `confirm_meal`
 * para que sean atómicos -- ver su definición en
 * supabase/migrations/20260808110000_confirm_meal_deducts_inventory.sql
 * para el reparto oficina/casa y por qué es solo orientativo.
 */
export async function setMealConfirmed(
  supabase: SupabaseClient<Database>,
  params: { date: string; mealId: string; dishId: string; confirmed: boolean },
): Promise<void> {
  const { date, mealId, dishId, confirmed } = params;

  const { error } = await supabase.rpc("confirm_meal", {
    p_date: date,
    p_meal_id: mealId,
    p_dish_id: dishId,
    p_confirmed: confirmed,
  });
  if (error) {
    throw new Error(`setMealConfirmed: fallo en confirm_meal: ${error.message}`);
  }
}
