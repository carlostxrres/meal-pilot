import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "./database.types.js";
import type { DietaryRequirement, Ingredient, Meal } from "../engine/types.js";

/** Todo lo que necesita la UI de alta/edición de dishes: catálogo de ingredientes, meals y sus ventanas. */
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

export interface DishInput {
  name: string;
  dishType: string;
  mealId: string;
  /** Notas opcionales: preparación, momento ideal para tomarlo... */
  description?: string;
  components: { ingredientId: string; quantity: number }[];
}

function validateDishInput(input: DishInput): void {
  if (!input.name.trim()) throw new Error("El plato necesita un nombre");
  if (!input.mealId) throw new Error("El plato necesita un meal");
  if (input.components.length === 0) {
    throw new Error("El plato necesita al menos un ingrediente");
  }
  if (input.components.some((c) => !(c.quantity > 0))) {
    throw new Error("Todas las cantidades deben ser mayores que 0");
  }
}

/**
 * Da de alta una dish fija (ADR-0018): la fila de `dish` y sus
 * `dish_ingredient`. No exige que la dish caiga dentro de la ventana de su
 * meal — la UI muestra el cumplimiento en vivo y `/dishes` la marcará si
 * queda fuera, pero la decisión final es del usuario.
 */
export async function createDish(
  supabase: SupabaseClient<Database>,
  input: DishInput,
): Promise<string> {
  validateDishInput(input);

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();
  if (userError || !user) {
    throw new Error("No hay usuario autenticado");
  }

  const { data: dish, error: dishError } = await supabase
    .from("dish")
    .insert({
      owner_id: user.id,
      name: input.name.trim(),
      dish_type: input.dishType.trim() || "Otro",
      meal_id: input.mealId,
      description: input.description?.trim() || null,
    })
    .select("id")
    .single();
  if (dishError || !dish) {
    throw new Error(`Fallo creando el plato: ${dishError?.message ?? "sin fila"}`);
  }

  const { error: componentsError } = await supabase.from("dish_ingredient").insert(
    input.components.map((c) => ({
      dish_id: dish.id,
      ingredient_id: c.ingredientId,
      quantity: c.quantity,
    })),
  );
  if (componentsError) {
    // No dejar un plato a medias: sin componentes no es un plato válido.
    await supabase.from("dish").delete().eq("id", dish.id);
    throw new Error(`Fallo añadiendo los ingredientes: ${componentsError.message}`);
  }

  return dish.id;
}

/**
 * Edita una dish existente: reemplaza su fila y todos sus `dish_ingredient`
 * (se borran los anteriores y se insertan los del formulario — más simple
 * que diffear, aceptable para un catálogo de un único usuario).
 */
export async function updateDish(
  supabase: SupabaseClient<Database>,
  dishId: string,
  input: DishInput,
): Promise<void> {
  validateDishInput(input);

  const { error: dishError } = await supabase
    .from("dish")
    .update({
      name: input.name.trim(),
      dish_type: input.dishType.trim() || "Otro",
      meal_id: input.mealId,
      description: input.description?.trim() || null,
    })
    .eq("id", dishId);
  if (dishError) {
    throw new Error(`Fallo guardando el plato: ${dishError.message}`);
  }

  const { error: deleteError } = await supabase.from("dish_ingredient").delete().eq("dish_id", dishId);
  if (deleteError) {
    throw new Error(`Fallo actualizando los ingredientes: ${deleteError.message}`);
  }

  const { error: insertError } = await supabase.from("dish_ingredient").insert(
    input.components.map((c) => ({
      dish_id: dishId,
      ingredient_id: c.ingredientId,
      quantity: c.quantity,
    })),
  );
  if (insertError) {
    throw new Error(`Fallo actualizando los ingredientes: ${insertError.message}`);
  }
}
