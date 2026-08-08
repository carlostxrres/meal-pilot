import type { SupabaseClient } from "@supabase/supabase-js";
import { createSeededRandom } from "../engine/random.js";
import {
  buildRequirementStatuses,
  generateMultiDayPlan,
  replayAccumulation,
  weekPeriodStart,
  type ReplayDay,
} from "../engine/resolve.js";
import type {
  DayProposal,
  DietaryRequirement,
  Dish,
  DishIngredient,
  Ingredient,
  Meal,
  MealProposal,
  ResolvedComponent,
  ResolvedDish,
  Supplement,
} from "../engine/types.js";
import type { Database } from "./database.types.js";
import { fetchContextsForDates } from "./multiDay.js";
import { parsePlannedMealComponents, serializePlannedMealComponents } from "./plannedMealComponents.js";
import { RequestCache } from "./requestCache.js";

type PlannedMealRow = Database["public"]["Tables"]["planned_meal"]["Row"];

function addDays(dateStr: string, delta: number): string {
  const d = new Date(`${dateStr}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + delta);
  return d.toISOString().slice(0, 10);
}

function dateRangeInclusive(startDate: string, endDate: string): string[] {
  const dates: string[] = [];
  for (let d = startDate; d <= endDate; d = addDays(d, 1)) dates.push(d);
  return dates;
}

function keyOf(date: string, mealId: string): string {
  return `${date}::${mealId}`;
}

/** Todo lo que hace falta del catálogo vigente para reconstruir/generar, pedido una vez y reutilizado. */
interface ReconstructionCatalog {
  ingredientsById: Map<string, Ingredient>;
  dishesById: Map<string, Dish>; // TODAS las dishes (activas o no) -- ver nota en fetchReconstructionCatalog
  dishIngredientsByDishId: Map<string, DishIngredient[]>;
  meals: Meal[];
  supplementsByMealId: Map<string, Supplement[]>;
  requirements: DietaryRequirement[];
  categoryIdsByIngredientId: Map<string, Set<string>>;
}

/**
 * A diferencia de `fetchDailyContext` (que filtra `dish.active = true`
 * porque solo le interesan candidatas para generar), aquí hacen falta TODAS
 * las dishes: un `planned_meal.dish_id` puede apuntar a una dish ya
 * desactivada (o incluso borrada, en cuyo caso ya sería null por el ON
 * DELETE SET NULL) y hay que poder reconstruir igualmente lo comprometido.
 */
async function fetchReconstructionCatalog(
  supabase: SupabaseClient<Database>,
  cache: RequestCache,
): Promise<ReconstructionCatalog> {
  const [
    { data: ingredients, error: ingredientsError },
    { data: dishesAll, error: dishesError },
    { data: dishIngredients, error: dishIngredientsError },
    { data: mealsRaw, error: mealsError },
    { data: supplements, error: supplementsError },
    { data: requirements, error: requirementsError },
    { data: categoryLinks, error: categoryLinksError },
  ] = await Promise.all([
    cache.get("ingredient:all", () => supabase.from("ingredient").select("*").order("name")),
    cache.get("dish:all", () => supabase.from("dish").select("*")),
    cache.get("dish_ingredient:all", () => supabase.from("dish_ingredient").select("*").order("position")),
    cache.get("meal:all", () => supabase.from("meal").select("*").order("usual_start_time")),
    cache.get("supplement:all", () => supabase.from("supplement").select("*")),
    cache.get("dietary_requirement:all", () => supabase.from("dietary_requirement").select("*")),
    cache.get("ingredient_category_link:all", () => supabase.from("ingredient_category_link").select("*")),
  ]);

  for (const [name, error] of Object.entries({
    ingredientsError,
    dishesError,
    dishIngredientsError,
    mealsError,
    supplementsError,
    requirementsError,
    categoryLinksError,
  })) {
    if (error) throw new Error(`fetchReconstructionCatalog: fallo consultando ${name}: ${error.message}`);
  }

  const ingredientsById = new Map((ingredients ?? []).map((i) => [i.id, i]));
  const dishesById = new Map((dishesAll ?? []).map((d) => [d.id, d]));

  const dishIngredientsByDishId = new Map<string, DishIngredient[]>();
  for (const di of dishIngredients ?? []) {
    if (!dishIngredientsByDishId.has(di.dish_id)) dishIngredientsByDishId.set(di.dish_id, []);
    dishIngredientsByDishId.get(di.dish_id)!.push(di);
  }

  const supplementsByMealId = new Map<string, Supplement[]>();
  for (const supplement of supplements ?? []) {
    if (!supplementsByMealId.has(supplement.meal_id)) supplementsByMealId.set(supplement.meal_id, []);
    supplementsByMealId.get(supplement.meal_id)!.push(supplement);
  }

  const categoryIdsByIngredientId = new Map<string, Set<string>>();
  for (const link of categoryLinks ?? []) {
    if (!ingredientsById.has(link.ingredient_id)) continue;
    if (!categoryIdsByIngredientId.has(link.ingredient_id)) {
      categoryIdsByIngredientId.set(link.ingredient_id, new Set());
    }
    categoryIdsByIngredientId.get(link.ingredient_id)!.add(link.category_id);
  }

  return {
    ingredientsById,
    dishesById,
    dishIngredientsByDishId,
    meals: mealsRaw ?? [],
    supplementsByMealId,
    requirements: requirements ?? [],
    categoryIdsByIngredientId,
  };
}

/**
 * Un `planned_meal` comprometido -> `ResolvedDish`, materializando sus
 * componentes congelados contra el catálogo vigente de ingredientes.
 * `null` si el slot nunca tuvo candidata (dish_id y dish_name ambos null,
 * ver `unresolved_reason`).
 *
 * `dish_id` no nulo siempre resuelve en `dishesById` (la FK lo garantiza:
 * `ON DELETE SET NULL` deja `dish_id` en null si la dish se borra, nunca
 * apunta a una fila inexistente). El placeholder solo cubre el caso
 * "dish_id null pero dish_name presente" -- una dish que sí existía cuando
 * se comprometió y se borró después.
 */
/** Exportado solo para test unitario -- no forma parte de la API pública del paquete en la práctica. */
export function reconstructResolvedDish(
  row: Pick<PlannedMealRow, "dish_id" | "dish_name" | "components" | "generated_at">,
  dishesById: ReadonlyMap<string, Dish>,
  ingredientsById: ReadonlyMap<string, Ingredient>,
): ResolvedDish | null {
  if (row.dish_id === null && row.dish_name === null) return null;

  const components: ResolvedComponent[] = parsePlannedMealComponents(row.components)
    .map((c) => {
      const ingredient = ingredientsById.get(c.ingredientId);
      return ingredient ? { ingredient, quantity: c.quantity } : null;
    })
    .filter((c): c is ResolvedComponent => c !== null);

  const dish: Dish =
    (row.dish_id !== null ? dishesById.get(row.dish_id) : undefined) ??
    ({
      id: "",
      owner_id: "",
      name: row.dish_name ?? "(plato eliminado)",
      dish_type: "",
      meal_id: "",
      description: null,
      active: false,
      created_at: row.generated_at,
      updated_at: row.generated_at,
    } satisfies Dish);

  return { dish, components };
}

/**
 * Ventana `[startDate, endDate]` (ambos inclusive) ya resuelta, aplicando la
 * regla de dos vías del ADR-0019 por cada (date, meal_id): manda `meal_log`
 * si existe, si no `planned_meal`. Devuelve también los `planned_meal` de la
 * ventana ya indexados por clave, para que el llamador no tenga que volver
 * a pedirlos si además necesita pintar el compromiso literal (no lo que
 * ganase la regla de dos vías).
 */
async function fetchResolvedWindow(
  supabase: SupabaseClient<Database>,
  startDate: string,
  endDate: string,
  catalog: ReconstructionCatalog,
): Promise<{ days: ReplayDay[]; plannedMealsByKey: Map<string, PlannedMealRow> }> {
  const dates = dateRangeInclusive(startDate, endDate);
  if (dates.length === 0) return { days: [], plannedMealsByKey: new Map() };

  const [{ data: plannedRows, error: plannedError }, { data: mealLogRows, error: mealLogError }] =
    await Promise.all([
      supabase.from("planned_meal").select("*").gte("date", startDate).lte("date", endDate),
      supabase.from("meal_log").select("*").gte("date", startDate).lte("date", endDate),
    ]);
  if (plannedError) {
    throw new Error(`fetchResolvedWindow: fallo consultando planned_meal: ${plannedError.message}`);
  }
  if (mealLogError) {
    throw new Error(`fetchResolvedWindow: fallo consultando meal_log: ${mealLogError.message}`);
  }

  const mealLogByKey = new Map((mealLogRows ?? []).map((log) => [keyOf(log.date, log.meal_id), log]));
  const plannedMealsByKey = new Map((plannedRows ?? []).map((row) => [keyOf(row.date, row.meal_id), row]));

  const days: ReplayDay[] = dates.map((date) => {
    const resolvedByMealId = new Map<string, ResolvedDish | null>();
    for (const meal of catalog.meals) {
      const key = keyOf(date, meal.id);
      const log = mealLogByKey.get(key);
      if (log) {
        // ADR-0022: dish_id null es "comí fuera" o "no comí" (confirmed
        // distingue cuál) -- ninguno de los dos cuenta nutrientes/ingredientes.
        const dish = log.dish_id ? catalog.dishesById.get(log.dish_id) : undefined;
        const components = (dish ? catalog.dishIngredientsByDishId.get(dish.id) : undefined) ?? [];
        const resolvedComponents = components
          .map((c) => {
            const ingredient = catalog.ingredientsById.get(c.ingredient_id);
            return ingredient ? { ingredient, quantity: c.quantity } : null;
          })
          .filter((c): c is ResolvedComponent => c !== null);
        resolvedByMealId.set(meal.id, dish ? { dish, components: resolvedComponents } : null);
        continue;
      }
      const planned = plannedMealsByKey.get(key);
      resolvedByMealId.set(
        meal.id,
        planned ? reconstructResolvedDish(planned, catalog.dishesById, catalog.ingredientsById) : null,
      );
    }
    return { date, resolvedByMealId };
  });

  return { days, plannedMealsByKey };
}

/** Fecha más antigua que puede afectar a algún requisito `period = week` que contenga `date`, o `date` si no hay ninguno. */
function earliestWeekPeriodStart(date: string, requirements: readonly DietaryRequirement[]): string {
  let earliest = date;
  for (const req of requirements) {
    if (req.period === "week" && req.week_reset_day) {
      const start = weekPeriodStart(date, req.week_reset_day);
      if (start < earliest) earliest = start;
    }
  }
  return earliest;
}

async function generateAndCommitMissingDays(
  supabase: SupabaseClient<Database>,
  dates: readonly string[],
  firstMissingIndex: number,
  catalog: ReconstructionCatalog,
  cache: RequestCache,
): Promise<void> {
  const datesToGenerate = dates.slice(firstMissingIndex);
  const firstMissingDate = datesToGenerate[0]!;

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();
  if (userError || !user) {
    throw new Error(
      "ensureCommittedPlan: no hay usuario autenticado -- el roll-forward no puede comprometer un plan sin owner_id (el CLI, con service_role, no puede escribir planned_meal, ver ADR-0019)",
    );
  }

  const replayStart = earliestWeekPeriodStart(firstMissingDate, catalog.requirements);
  const historyEnd = addDays(firstMissingDate, -1);
  const { days: historyDays } =
    replayStart <= historyEnd
      ? await fetchResolvedWindow(supabase, replayStart, historyEnd, catalog)
      : { days: [] as ReplayDay[] };

  const initialVirtualStock = new Map<string, number>();
  for (const ingredient of catalog.ingredientsById.values()) {
    initialVirtualStock.set(ingredient.id, ingredient.office_inventory + ingredient.home_inventory);
  }

  const { accumulated, recentlyUsedIngredientIds, virtualStock } = replayAccumulation(
    historyDays,
    catalog.requirements,
    catalog.categoryIdsByIngredientId,
    initialVirtualStock,
  );

  const contexts = await fetchContextsForDates(supabase, datesToGenerate, cache);
  const proposals = generateMultiDayPlan(contexts, createSeededRandom(firstMissingDate), {
    accumulated,
    recentlyUsedIngredientIds,
    virtualStock,
  });

  const rows = proposals.flatMap((proposal) =>
    proposal.meals.map((mealProposal) => ({
      owner_id: user.id,
      date: proposal.date,
      meal_id: mealProposal.meal.id,
      dish_id: mealProposal.resolved?.dish.id ?? null,
      dish_name: mealProposal.resolved?.dish.name ?? null,
      unresolved_reason: mealProposal.unresolvedReason,
      components: mealProposal.resolved
        ? serializePlannedMealComponents(
            mealProposal.resolved.components.map((c) => ({
              ingredientId: c.ingredient.id,
              quantity: c.quantity,
            })),
          )
        : [],
    })),
  );

  if (rows.length === 0) return;

  // on conflict do nothing: si otra request ganó la carrera y ya comprometió
  // este mismo (date, meal_id), se descarta lo generado aquí -- el llamador
  // vuelve a leer de la base de datos después, nunca pinta esto en memoria.
  const { error: upsertError } = await supabase
    .from("planned_meal")
    .upsert(rows, { onConflict: "owner_id,date,meal_id", ignoreDuplicates: true });
  if (upsertError) {
    throw new Error(`ensureCommittedPlan: fallo comprometiendo planned_meal: ${upsertError.message}`);
  }
}

/**
 * El punto de entrada del plan comprometido (ADR-0019): garantiza que
 * `dates` esté comprometido en `planned_meal` (generando y comprometiendo
 * perezosamente solo lo que falte, encadenado detrás de lo ya comprometido)
 * y devuelve siempre lo **leído** de la base de datos, nunca lo generado en
 * memoria -- así una carrera entre dos requests concurrentes pinta lo mismo
 * en ambas.
 *
 * No dispara nada si `dates` ya está completo: marcar comprado, editar
 * inventario o confirmar un meal nunca deben llamar a esto con la intención
 * de "refrescar" -- ADR-0019 es explícito en que esas acciones no
 * regeneran nada.
 */
export async function ensureCommittedPlan(
  supabase: SupabaseClient<Database>,
  dates: readonly string[],
  cache: RequestCache = new RequestCache(),
): Promise<DayProposal[]> {
  if (dates.length === 0) return [];

  const catalog = await fetchReconstructionCatalog(supabase, cache);

  const { data: existingRows, error: existingError } = await supabase
    .from("planned_meal")
    .select("date, meal_id")
    .in("date", dates as string[]);
  if (existingError) {
    throw new Error(`ensureCommittedPlan: fallo consultando planned_meal: ${existingError.message}`);
  }

  const countByDate = new Map<string, number>();
  for (const row of existingRows ?? []) {
    countByDate.set(row.date, (countByDate.get(row.date) ?? 0) + 1);
  }
  const firstMissingIndex = dates.findIndex((date) => (countByDate.get(date) ?? 0) < catalog.meals.length);

  if (firstMissingIndex !== -1) {
    await generateAndCommitMissingDays(supabase, dates, firstMissingIndex, catalog, cache);
  }

  const replayStart = earliestWeekPeriodStart(dates[0]!, catalog.requirements);
  const lastDate = dates[dates.length - 1]!;
  const { days, plannedMealsByKey } = await fetchResolvedWindow(supabase, replayStart, lastDate, catalog);
  const { accumulatedByDay } = replayAccumulation(days, catalog.requirements, catalog.categoryIdsByIngredientId);

  return dates.map((date) => {
    const windowIndex = days.findIndex((d) => d.date === date);
    const accumulated = windowIndex === -1 ? new Map<string, number>() : accumulatedByDay[windowIndex]!;

    const meals: MealProposal[] = catalog.meals.map((meal) => {
      const supplements = catalog.supplementsByMealId.get(meal.id) ?? [];
      const row = plannedMealsByKey.get(keyOf(date, meal.id));
      if (!row) {
        return {
          meal,
          supplements,
          resolved: null,
          unresolvedReason: "Este día todavía no se ha comprometido.",
        };
      }
      return {
        meal,
        supplements,
        resolved: reconstructResolvedDish(row, catalog.dishesById, catalog.ingredientsById),
        unresolvedReason: row.unresolved_reason,
      };
    });

    return {
      date,
      meals,
      requirementStatuses: buildRequirementStatuses(catalog.requirements, accumulated),
    };
  });
}
