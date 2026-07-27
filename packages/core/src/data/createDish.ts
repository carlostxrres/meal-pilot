import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "./database.types.js";
import type { DietaryRequirement, Ingredient, Meal } from "../engine/types.js";

/** Todo lo que necesita la UI de alta de dishes: catálogo de ingredientes, meals y sus ventanas. */
export interface DishAuthoringContext {
  ingredients: Ingredient[];
  meals: Meal[];
  /** Requisitos ligados a un meal (las ventanas nutricionales del ADR-0017). */
  mealRequirements: DietaryRequirement[];
}

export async function fetchDishAuthoringContext(
  supabase: SupabaseClient<Database>,
): Promise<DishAuthoringContext> {
  const [
    { data: ingredients, error: ingredientsError },
    { data: meals, error: mealsError },
    { data: mealRequirements, error: requirementsError },
  ] = await Promise.all([
    supabase.from("ingredient").select("*").order("name"),
    supabase.from("meal").select("*").order("usual_start_time"),
    supabase.from("dietary_requirement").select("*").not("meal_id", "is", null),
  ]);
  const error = ingredientsError ?? mealsError ?? requirementsError;
  if (error) throw new Error(`fetchDishAuthoringContext: ${error.message}`);

  return {
    ingredients: ingredients ?? [],
    meals: meals ?? [],
    mealRequirements: mealRequirements ?? [],
  };
}

export interface CreateDishInput {
  name: string;
  dishType: string;
  mealId: string;
  components: { ingredientId: string; quantity: number }[];
}

/**
 * Da de alta una dish fija (ADR-0018): la fila de `dish` y sus
 * `dish_ingredient`. No exige que la dish caiga dentro de la ventana de su
 * meal — la UI muestra el cumplimiento en vivo y `/dishes` la marcará si
 * queda fuera, pero la decisión final es del usuario.
 */
export async function createDish(
  supabase: SupabaseClient<Database>,
  input: CreateDishInput,
): Promise<string> {
  if (!input.name.trim()) throw new Error("createDish: la dish necesita un nombre");
  if (!input.mealId) throw new Error("createDish: la dish necesita un meal");
  if (input.components.length === 0) {
    throw new Error("createDish: la dish necesita al menos un ingrediente");
  }
  if (input.components.some((c) => !(c.quantity > 0))) {
    throw new Error("createDish: todas las cantidades deben ser mayores que 0");
  }

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();
  if (userError || !user) {
    throw new Error("createDish: no hay usuario autenticado");
  }

  const { data: dish, error: dishError } = await supabase
    .from("dish")
    .insert({
      owner_id: user.id,
      name: input.name.trim(),
      dish_type: input.dishType.trim() || "Otro",
      meal_id: input.mealId,
    })
    .select("id")
    .single();
  if (dishError || !dish) {
    throw new Error(`createDish: fallo insertando dish: ${dishError?.message ?? "sin fila"}`);
  }

  const { error: componentsError } = await supabase.from("dish_ingredient").insert(
    input.components.map((c) => ({
      dish_id: dish.id,
      ingredient_id: c.ingredientId,
      quantity: c.quantity,
    })),
  );
  if (componentsError) {
    // No dejar una dish a medias: sin componentes no es una dish válida.
    await supabase.from("dish").delete().eq("id", dish.id);
    throw new Error(`createDish: fallo insertando componentes: ${componentsError.message}`);
  }

  return dish.id;
}
