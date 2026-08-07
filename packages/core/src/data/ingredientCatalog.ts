import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "./database.types.js";
import { RequestCache } from "./requestCache.js";
import {
  NUTRIENT_COLUMNS,
  type Ingredient,
  type IngredientPurchaseLink,
  type NutrientColumn,
  type Supermarket,
} from "../engine/types.js";

export interface IngredientCatalogEntry {
  ingredient: Ingredient;
  purchaseLinks: IngredientPurchaseLink[];
}

/**
 * Catálogo completo de ingredientes con sus links de compra, para
 * /ingredients. La query de `ingredient` es la misma que usa
 * `fetchDailyContext` (llamada, vía `generateProposalsForDates`, en la misma
 * página) — comparten `cache` para pedir la tabla una sola vez.
 */
export async function fetchIngredientCatalog(
  supabase: SupabaseClient<Database>,
  cache: RequestCache = new RequestCache(),
): Promise<IngredientCatalogEntry[]> {
  const [
    { data: ingredients, error: ingredientsError },
    { data: links, error: linksError },
  ] = await Promise.all([
    cache.get("ingredient:all", () => supabase.from("ingredient").select("*").order("name")),
    supabase.from("ingredient_purchase_link").select("*"),
  ]);
  const error = ingredientsError ?? linksError;
  if (error) throw new Error(`fetchIngredientCatalog: ${error.message}`);

  const linksByIngredient = new Map<string, IngredientPurchaseLink[]>();
  for (const link of links ?? []) {
    if (!linksByIngredient.has(link.ingredient_id)) linksByIngredient.set(link.ingredient_id, []);
    linksByIngredient.get(link.ingredient_id)!.push(link);
  }

  return (ingredients ?? []).map((ingredient) => ({
    ingredient,
    purchaseLinks: linksByIngredient.get(ingredient.id) ?? [],
  }));
}

export interface IngredientInput {
  name: string;
  baseUnit: Ingredient["base_unit"];
  storageType: Ingredient["storage_type"];
  animalOrigin: Ingredient["animal_origin"];
  recommendedTime: Ingredient["recommended_time"];
  /** Notas libres del usuario. */
  description?: string;
  pantryShelfLifeDays?: number;
  fridgeShelfLifeDays?: number;
  freezerShelfLifeDays?: number;
  priceEurPer100?: number;
  maxQuantityPerDish?: number;
  nutrients: Partial<Record<NutrientColumn, number>>;
  purchaseLinks: { supermarket: Supermarket; url: string }[];
}

function validateIngredientInput(input: IngredientInput): void {
  if (!input.name.trim()) throw new Error("El ingrediente necesita un nombre");
  if (input.purchaseLinks.some((l) => !l.url.trim())) {
    throw new Error("Todos los links de compra necesitan una URL");
  }
}

function nutrientColumns(nutrients: Partial<Record<NutrientColumn, number>>): Record<NutrientColumn, number | null> {
  return Object.fromEntries(
    NUTRIENT_COLUMNS.map((column) => [column, nutrients[column] ?? null]),
  ) as Record<NutrientColumn, number | null>;
}

/** Da de alta un ingrediente y sus links de compra. */
export async function createIngredient(
  supabase: SupabaseClient<Database>,
  input: IngredientInput,
): Promise<string> {
  validateIngredientInput(input);

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();
  if (userError || !user) {
    throw new Error("No hay usuario autenticado");
  }

  const { data: ingredient, error: ingredientError } = await supabase
    .from("ingredient")
    .insert({
      owner_id: user.id,
      name: input.name.trim(),
      base_unit: input.baseUnit,
      storage_type: input.storageType,
      animal_origin: input.animalOrigin,
      recommended_time: input.recommendedTime,
      description: input.description?.trim() || null,
      pantry_shelf_life_days: input.pantryShelfLifeDays ?? null,
      fridge_shelf_life_days: input.fridgeShelfLifeDays ?? null,
      freezer_shelf_life_days: input.freezerShelfLifeDays ?? null,
      price_eur_per_100: input.priceEurPer100 ?? null,
      max_quantity_per_dish: input.maxQuantityPerDish ?? null,
      ...nutrientColumns(input.nutrients),
    })
    .select("id")
    .single();
  if (ingredientError || !ingredient) {
    throw new Error(`Fallo creando el ingrediente: ${ingredientError?.message ?? "sin fila"}`);
  }

  if (input.purchaseLinks.length > 0) {
    const { error: linksError } = await supabase.from("ingredient_purchase_link").insert(
      input.purchaseLinks.map((l) => ({
        ingredient_id: ingredient.id,
        supermarket: l.supermarket,
        url: l.url.trim(),
      })),
    );
    if (linksError) {
      // No dejar un ingrediente a medias: si fallan sus links, no queda creado.
      await supabase.from("ingredient").delete().eq("id", ingredient.id);
      throw new Error(`Fallo añadiendo los links de compra: ${linksError.message}`);
    }
  }

  return ingredient.id;
}

/**
 * Edita un ingrediente existente: reemplaza su fila y todos sus
 * `ingredient_purchase_link` (se borran los anteriores y se insertan los del
 * formulario, igual que `updateDish` hace con `dish_ingredient`).
 */
export async function updateIngredient(
  supabase: SupabaseClient<Database>,
  ingredientId: string,
  input: IngredientInput,
): Promise<void> {
  validateIngredientInput(input);

  const { error: ingredientError } = await supabase
    .from("ingredient")
    .update({
      name: input.name.trim(),
      base_unit: input.baseUnit,
      storage_type: input.storageType,
      animal_origin: input.animalOrigin,
      recommended_time: input.recommendedTime,
      description: input.description?.trim() || null,
      pantry_shelf_life_days: input.pantryShelfLifeDays ?? null,
      fridge_shelf_life_days: input.fridgeShelfLifeDays ?? null,
      freezer_shelf_life_days: input.freezerShelfLifeDays ?? null,
      price_eur_per_100: input.priceEurPer100 ?? null,
      max_quantity_per_dish: input.maxQuantityPerDish ?? null,
      ...nutrientColumns(input.nutrients),
    })
    .eq("id", ingredientId);
  if (ingredientError) {
    throw new Error(`Fallo guardando el ingrediente: ${ingredientError.message}`);
  }

  const { error: deleteError } = await supabase
    .from("ingredient_purchase_link")
    .delete()
    .eq("ingredient_id", ingredientId);
  if (deleteError) {
    throw new Error(`Fallo actualizando los links de compra: ${deleteError.message}`);
  }

  if (input.purchaseLinks.length > 0) {
    const { error: insertError } = await supabase.from("ingredient_purchase_link").insert(
      input.purchaseLinks.map((l) => ({
        ingredient_id: ingredientId,
        supermarket: l.supermarket,
        url: l.url.trim(),
      })),
    );
    if (insertError) {
      throw new Error(`Fallo actualizando los links de compra: ${insertError.message}`);
    }
  }
}

/** Habilita o deshabilita un ingrediente (no lo borra, solo lo oculta del alta de nuevos platos). */
export async function setIngredientEnabled(
  supabase: SupabaseClient<Database>,
  ingredientId: string,
  enabled: boolean,
): Promise<void> {
  const { error } = await supabase.from("ingredient").update({ enabled }).eq("id", ingredientId);
  if (error) {
    throw new Error(`Fallo cambiando el estado del ingrediente: ${error.message}`);
  }
}
