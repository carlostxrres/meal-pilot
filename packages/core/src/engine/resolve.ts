import { pickRandom } from "./random.js";
import type {
  DailyContext,
  DayProposal,
  DietaryRequirement,
  DishWithComponents,
  Ingredient,
  MealProposal,
  MealWithCandidates,
  RequirementStatus,
  ResolvedDish,
} from "./types.js";

// ADR-0020: suma ponderada de términos que compiten, no tiers léxicos. Los
// pesos nacen provisionales -- la calibración depende de tener un catálogo
// de platos sano (ver docs/status.md) -- y viven aquí, con su
// justificación, para que cualquier retoque futuro sepa qué está ajustando:
//   - coste y repetición PENALIZAN, contados en unidades absolutas (nº de
//     componentes que faltan / se repiten), nunca como fracción del tamaño
//     del plato -- de eso sale el invariante de neutralidad al tamaño: un
//     plato sin nada que comprar y sin repeticiones puntúa igual con 1
//     componente que con 6 (ver el test de propiedad en resolve.test.ts).
//   - ayudar a un mínimo mandatory global pendiente PREMIA, a nivel de
//     plato (0/1) y no por componente sumado/promediado.
//   - el drenaje PREMIA vaciar lo que más stock virtual acumula. Es el
//     único término continuo, así que es el que rompe la mayoría de los
//     empates sin que la semilla por fecha deje de tener papel en los
//     empates genuinos (dos platos idénticos en los demás términos).
const WEIGHT_MANDATORY_HELP = 5;
const WEIGHT_COST = 2;
const WEIGHT_REPETITION = 1;
const WEIGHT_DRAINAGE = 1;

/**
 * Escala de referencia para normalizar el drenaje a un [0,1] aproximado --
 * evita que un ingrediente con muchísimo stock domine el término sin límite
 * frente al resto de señales.
 */
const DRAINAGE_REFERENCE_STOCK = 500;

/**
 * Tolerancia para comparar scores float como iguales. Al contar en enteros,
 * dos platos igual de cubiertos y de frescos empatan de verdad y con
 * frecuencia -- el drenaje (el único término continuo) es el que rompe la
 * mayoría de esos empates, y el epsilon evita que lo haga por el último bit
 * del float en vez de por una diferencia real (ver ADR-0020).
 */
const SCORE_EPSILON = 1e-9;

export function effectiveBounds(requirement: DietaryRequirement) {
  const margin = requirement.tolerance_margin;
  const effectiveMinimum =
    requirement.minimum == null ? null : requirement.minimum * (1 - margin);
  const effectiveMaximum =
    requirement.maximum == null ? null : requirement.maximum * (1 + margin);
  return { effectiveMinimum, effectiveMaximum };
}

function ingredientMatchesRequirementScope(
  ingredient: Ingredient,
  requirement: DietaryRequirement,
  categoryIdsByIngredientId: ReadonlyMap<string, Set<string>>,
): boolean {
  switch (requirement.scope_type) {
    case "ingredient":
      return ingredient.id === requirement.scope_ingredient_id;
    case "ingredient_category": {
      const cats = categoryIdsByIngredientId.get(ingredient.id);
      return (
        !!requirement.scope_category_id &&
        !!cats?.has(requirement.scope_category_id)
      );
    }
    case "nutrient": {
      const col = requirement.scope_nutrient_column as keyof Ingredient | null;
      if (!col) return false;
      const value = ingredient[col];
      return typeof value === "number" && value > 0;
    }
    default:
      return false;
  }
}

/** Cuánto aporta un ingrediente (con una cantidad concreta) a un requisito. */
function contribution(
  ingredient: Ingredient,
  quantity: number,
  requirement: DietaryRequirement,
  categoryIdsByIngredientId: ReadonlyMap<string, Set<string>>,
): number {
  if (requirement.scope_type === "nutrient") {
    const col = requirement.scope_nutrient_column as keyof Ingredient | null;
    if (!col) return 0;
    const perHundred = ingredient[col];
    return typeof perHundred === "number" ? (perHundred * quantity) / 100 : 0;
  }
  return ingredientMatchesRequirementScope(
    ingredient,
    requirement,
    categoryIdsByIngredientId,
  )
    ? quantity
    : 0;
}

function pickBestByScore<T>(
  items: readonly T[],
  scoreOf: (item: T) => number,
  rand: () => number,
): T {
  let bestScore = -Infinity;
  for (const item of items) bestScore = Math.max(bestScore, scoreOf(item));
  const best = items.filter((item) => scoreOf(item) >= bestScore - SCORE_EPSILON);
  return pickRandom(best, rand);
}

/**
 * Materializa una dish fija (ADR-0018): cada componente es un ingrediente
 * concreto con su cantidad. Devuelve null si algún ingrediente referenciado
 * no existe en el catálogo (entrada externa, conviene no asumirlo).
 */
export function toResolvedDish(
  dishWithComponents: DishWithComponents,
  ctx: DailyContext,
): ResolvedDish | null {
  const components = [];
  for (const component of dishWithComponents.components) {
    const ingredient = ctx.ingredientsById.get(component.ingredient_id);
    if (!ingredient) return null;
    components.push({ ingredient, quantity: component.quantity });
  }
  return { dish: dishWithComponents.dish, components };
}

function totalContribution(
  resolved: ResolvedDish,
  requirement: DietaryRequirement,
  categoryIdsByIngredientId: ReadonlyMap<string, Set<string>>,
): number {
  return resolved.components.reduce(
    (sum, c) =>
      sum + contribution(c.ingredient, c.quantity, requirement, categoryIdsByIngredientId),
    0,
  );
}

/**
 * Filtro duro de generación: solo los requisitos globales (meal_id = null)
 * mandatory con techo — ej. el máximo semanal de atún. Las ventanas
 * nutricionales del propio meal (meal_id != null, ADR-0017) no se filtran
 * aquí: las dishes fijas las cumplen por construcción (se validan al
 * crearlas, ver compliance.ts), no en generación.
 */
function violatesMandatoryMaximum(
  resolved: ResolvedDish,
  globalRequirements: readonly DietaryRequirement[],
  runningAccumulated: ReadonlyMap<string, number>,
  categoryIdsByIngredientId: ReadonlyMap<string, Set<string>>,
): boolean {
  return globalRequirements.some((req) => {
    if (req.strictness !== "mandatory" || req.maximum == null) return false;
    const { effectiveMaximum } = effectiveBounds(req);
    if (effectiveMaximum == null) return false;
    const current = runningAccumulated.get(req.id) ?? 0;
    const added = totalContribution(resolved, req, categoryIdsByIngredientId);
    return current + added > effectiveMaximum;
  });
}

/** Coste de compra (ADR-0020): nº de componentes que el stock virtual NO cubre. Se cuenta, no se promedia -- ver invariante de neutralidad al tamaño. */
function missingComponentCount(
  resolved: ResolvedDish,
  virtualStock: ReadonlyMap<string, number>,
): number {
  return resolved.components.filter(
    (c) => (virtualStock.get(c.ingredient.id) ?? 0) < c.quantity,
  ).length;
}

/** Repetición (ADR-0020): nº de componentes usados recientemente. Se cuenta, no se promedia -- mismo motivo que el coste. */
function repeatedComponentCount(
  resolved: ResolvedDish,
  recentlyUsedIngredientIds: ReadonlySet<string>,
): number {
  return resolved.components.filter((c) => recentlyUsedIngredientIds.has(c.ingredient.id))
    .length;
}

/**
 * Ayuda a un mínimo mandatory global pendiente (ADR-0020): señal 0/1 a
 * nivel de plato entero, no por componente -- basta con que el plato, en su
 * conjunto, aporte algo a un requisito obligatorio con mínimo que todavía
 * no se ha alcanzado.
 */
function helpsPendingMandatoryMinimum(
  resolved: ResolvedDish,
  globalRequirements: readonly DietaryRequirement[],
  runningAccumulated: ReadonlyMap<string, number>,
  categoryIdsByIngredientId: ReadonlyMap<string, Set<string>>,
): boolean {
  return globalRequirements.some((req) => {
    if (req.strictness !== "mandatory" || req.minimum == null) return false;
    const { effectiveMinimum } = effectiveBounds(req);
    if (effectiveMinimum == null) return false;
    const current = runningAccumulated.get(req.id) ?? 0;
    if (current >= effectiveMinimum) return false;
    return totalContribution(resolved, req, categoryIdsByIngredientId) > 0;
  });
}

/**
 * Drenaje (ADR-0020): premia vaciar ingredientes con mucho stock virtual
 * acumulado, como aproximación heurística a "termina lo abierto antes de
 * abrir otra cosa" (no hay fecha de apertura por ingrediente todavía, ver
 * `ingredient.opened_shelf_life_days`, sin usar).
 *
 * Máximo entre componentes, no suma ni media: sumar favorecería a los
 * platos con más componentes (cada uno suma su propio drenaje); promediar
 * favorecería a los pequeños (un solo componente muy cargado de stock
 * alcanzaría el máximo posible). El máximo hace que añadir componentes que
 * no drenan más que el mejor ya presente no cambie la puntuación -- respeta
 * el mismo invariante de neutralidad al tamaño que coste y repetición.
 */
function drainageScore(resolved: ResolvedDish, virtualStock: ReadonlyMap<string, number>): number {
  let best = 0;
  for (const c of resolved.components) {
    const stockBefore = virtualStock.get(c.ingredient.id) ?? 0;
    const ratio = Math.min(1, stockBefore / DRAINAGE_REFERENCE_STOCK);
    if (ratio > best) best = ratio;
  }
  return best;
}

/** Exportado para el test de propiedad del invariante de neutralidad al tamaño (ADR-0020) -- no se usa fuera del motor en producción. */
export function scoreResolvedDish(
  resolved: ResolvedDish,
  globalRequirements: readonly DietaryRequirement[],
  runningAccumulated: ReadonlyMap<string, number>,
  ctx: DailyContext,
  virtualStock: ReadonlyMap<string, number>,
): number {
  const cost = missingComponentCount(resolved, virtualStock);
  const repetition = repeatedComponentCount(resolved, ctx.recentlyUsedIngredientIds);
  const helps = helpsPendingMandatoryMinimum(
    resolved,
    globalRequirements,
    runningAccumulated,
    ctx.categoryIdsByIngredientId,
  );
  const drainage = drainageScore(resolved, virtualStock);

  return (
    -WEIGHT_COST * cost -
    WEIGHT_REPETITION * repetition +
    WEIGHT_MANDATORY_HELP * (helps ? 1 : 0) +
    WEIGHT_DRAINAGE * drainage
  );
}

function resolveMeal(
  mealCtx: MealWithCandidates,
  allRequirements: readonly DietaryRequirement[],
  runningAccumulated: Map<string, number>,
  virtualStock: Map<string, number>,
  ctx: DailyContext,
  rand: () => number,
): MealProposal {
  const globalRequirements = allRequirements.filter((r) => r.meal_id === null);

  if (mealCtx.candidates.length === 0) {
    return {
      meal: mealCtx.meal,
      supplements: mealCtx.supplements,
      resolved: null,
      unresolvedReason: "No hay ninguna dish registrada para este meal (dish.meal_id).",
    };
  }

  const resolvedCandidates = mealCtx.candidates
    .map((c) => toResolvedDish(c, ctx))
    .filter((r): r is ResolvedDish => r !== null);

  if (resolvedCandidates.length === 0) {
    return {
      meal: mealCtx.meal,
      supplements: mealCtx.supplements,
      resolved: null,
      unresolvedReason:
        "Ninguna dish candidata pudo materializarse (algún ingrediente referenciado no existe).",
    };
  }

  const validCandidates = resolvedCandidates.filter(
    (r) => !violatesMandatoryMaximum(r, globalRequirements, runningAccumulated, ctx.categoryIdsByIngredientId),
  );

  if (validCandidates.length === 0) {
    return {
      meal: mealCtx.meal,
      supplements: mealCtx.supplements,
      resolved: null,
      unresolvedReason:
        "Todas las dishes candidatas violarían un requisito obligatorio (fuera de margen de tolerancia).",
    };
  }

  const chosen = pickBestByScore(
    validCandidates,
    (r) => scoreResolvedDish(r, globalRequirements, runningAccumulated, ctx, virtualStock),
    rand,
  );

  // El acumulado sí incluye los requisitos del propio meal (ADR-0017): su
  // status del día es exactamente el aporte de la dish elegida para ese meal.
  for (const req of allRequirements) {
    if (req.meal_id !== null && req.meal_id !== mealCtx.meal.id) continue;
    const added = totalContribution(chosen, req, ctx.categoryIdsByIngredientId);
    runningAccumulated.set(req.id, (runningAccumulated.get(req.id) ?? 0) + added);
  }

  // ADR-0020: decrementa el stock virtual con lo que consume la dish
  // elegida -- entre meals del mismo día y, vía la misma Map mutable
  // encadenada en generateMultiDayPlan, entre días del horizonte.
  for (const component of chosen.components) {
    const current = virtualStock.get(component.ingredient.id) ?? 0;
    virtualStock.set(component.ingredient.id, Math.max(0, current - component.quantity));
  }

  return {
    meal: mealCtx.meal,
    supplements: mealCtx.supplements,
    resolved: chosen,
    unresolvedReason: null,
  };
}

/** Exportado: la capa de datos lo reutiliza para recalcular el status de un día ya comprometido al leerlo (ADR-0019). */
export function buildRequirementStatuses(
  requirements: readonly DietaryRequirement[],
  runningAccumulated: ReadonlyMap<string, number>,
): RequirementStatus[] {
  return requirements.map((requirement) => {
    const accumulated = runningAccumulated.get(requirement.id) ?? 0;
    const { effectiveMinimum, effectiveMaximum } = effectiveBounds(requirement);
    const withinRange =
      (effectiveMinimum == null || accumulated >= effectiveMinimum) &&
      (effectiveMaximum == null || accumulated <= effectiveMaximum);
    return { requirement, accumulated, effectiveMinimum, effectiveMaximum, withinRange };
  });
}

const WEEKDAY_INDEX: Record<string, number> = {
  sun: 0,
  mon: 1,
  tue: 2,
  wed: 3,
  thu: 4,
  fri: 5,
  sat: 6,
};

/** Fecha (YYYY-MM-DD) de inicio de la ventana semanal de `date`, dado el día de reset. Exportado: lo reutiliza la capa de datos para el replay semanal (ADR-0019). */
export function weekPeriodStart(date: string, resetDay: string): string {
  const d = new Date(`${date}T00:00:00Z`);
  const diff = (d.getUTCDay() - (WEEKDAY_INDEX[resetDay] ?? 1) + 7) % 7;
  d.setUTCDate(d.getUTCDate() - diff);
  return d.toISOString().slice(0, 10);
}

/**
 * Qué requisitos tocan reinicio al pasar de `previousDate` a `date`:
 * los de `period = day` siempre, los de `period = week` solo si las dos
 * fechas caen en ventanas semanales distintas según su `week_reset_day`.
 * Compartido entre `generateMultiDayPlan` (genera) y `replayAccumulation`
 * (reconstruye lo ya comprometido) para que la regla de corte no diverja.
 */
function requirementsNeedingReset(
  requirements: readonly DietaryRequirement[],
  previousDate: string,
  date: string,
): DietaryRequirement[] {
  return requirements.filter((req) => {
    if (req.period === "day") return true;
    if (req.period === "week" && req.week_reset_day) {
      return weekPeriodStart(previousDate, req.week_reset_day) !== weekPeriodStart(date, req.week_reset_day);
    }
    return false;
  });
}

/**
 * Genera la propuesta de varios días **encadenados**: la diversidad y el
 * acumulado de los requisitos semanales se arrastran de un día al
 * siguiente dentro de la ventana (no cada día parte de cero), para que el
 * sistema pueda repartir a lo largo de la semana requisitos escasos (ej.
 * sardinas 2x/semana) y evitar repetir ingredientes rotables entre días
 * consecutivos del plan.
 *
 * Reglas de arrastre entre día N y N+1:
 *   - `period = day`: se reinicia cada día (empieza de 0, o del valor real
 *     de `requirement_log` para ese día si existiera).
 *   - `period = week`: se mantiene mientras las dos fechas caigan en la
 *     misma ventana semanal (según `week_reset_day`); si el plan cruza un
 *     reset de semana, también se reinicia.
 *   - Diversidad: los ingredientes usados en el día N se añaden al conjunto
 *     de "usados recientemente" antes de resolver el día N+1.
 *   - Stock virtual (ADR-0020): se inicializa una sola vez con el
 *     inventario real (`office_inventory + home_inventory`) y se decrementa
 *     al asignar cada dish, tanto entre meals del mismo día como entre
 *     días del horizonte -- sin esto, los mismos 200g de un ingrediente
 *     "cubrirían" los tres días del horizonte.
 *
 * Limitación conocida: sigue siendo un algoritmo voraz día a día (usa la
 * prioridad de "ayuda a un requisito no cumplido" al puntuar cada dish),
 * no un solver que mire todos los días a la vez para encontrar el reparto
 * óptimo — pero ya no genera cada día de forma aislada.
 *
 * Por defecto, todos los acumuladores (requisitos, diversidad, stock
 * virtual) se siembran desde `contexts[0]` -- correcto cuando el horizonte
 * completo se genera de una vez. La generación perezosa por días sueltos
 * (ADR-0019, roll-forward detrás de días ya comprometidos) necesita
 * sembrarlos por replay de `planned_meal` + `meal_log` en vez de por
 * `contexts[0]` (que con horizonte rodante puede estar a mitad de semana):
 * para eso acepta `seed`, que sustituye la siembra por defecto sin cambiar
 * nada del resto del algoritmo.
 */
export function generateMultiDayPlan(
  contexts: readonly DailyContext[],
  rand: () => number,
  seed?: {
    accumulated?: ReadonlyMap<string, number>;
    recentlyUsedIngredientIds?: ReadonlySet<string>;
    virtualStock?: ReadonlyMap<string, number>;
  },
): DayProposal[] {
  if (contexts.length === 0) return [];

  const requirements = contexts[0]!.requirements;
  const runningAccumulated = new Map<string, number>();
  if (seed?.accumulated) {
    for (const [reqId, value] of seed.accumulated) runningAccumulated.set(reqId, value);
  } else {
    for (const [reqId, log] of contexts[0]!.latestLogByRequirement) {
      runningAccumulated.set(reqId, log.accumulated);
    }
  }
  const recentlyUsed = new Set(seed?.recentlyUsedIngredientIds ?? contexts[0]!.recentlyUsedIngredientIds);

  const virtualStock = new Map<string, number>();
  if (seed?.virtualStock) {
    for (const [id, value] of seed.virtualStock) virtualStock.set(id, value);
  } else {
    for (const ingredient of contexts[0]!.ingredientsById.values()) {
      virtualStock.set(ingredient.id, ingredient.office_inventory + ingredient.home_inventory);
    }
  }

  const results: DayProposal[] = [];

  contexts.forEach((ctx, dayIndex) => {
    if (dayIndex > 0) {
      const previousDate = contexts[dayIndex - 1]!.date;
      for (const req of requirementsNeedingReset(requirements, previousDate, ctx.date)) {
        runningAccumulated.set(req.id, ctx.latestLogByRequirement.get(req.id)?.accumulated ?? 0);
      }
      for (const id of ctx.recentlyUsedIngredientIds) recentlyUsed.add(id);
    }

    const effectiveCtx: DailyContext = { ...ctx, recentlyUsedIngredientIds: recentlyUsed };
    const meals = ctx.meals.map((mealCtx) =>
      resolveMeal(mealCtx, requirements, runningAccumulated, virtualStock, effectiveCtx, rand),
    );

    for (const mealProposal of meals) {
      if (!mealProposal.resolved) continue;
      for (const component of mealProposal.resolved.components) {
        recentlyUsed.add(component.ingredient.id);
      }
    }

    results.push({
      date: ctx.date,
      meals,
      requirementStatuses: buildRequirementStatuses(requirements, runningAccumulated),
    });
  });

  return results;
}

/** Punto de entrada del motor para un único día (caso particular de un plan de 1 día). */
export function generateDayProposal(
  ctx: DailyContext,
  rand: () => number,
): DayProposal {
  return generateMultiDayPlan([ctx], rand)[0]!;
}

/** Un día ya resuelto (comprometido o histórico), sin nada que puntuar ni elegir. */
export interface ReplayDay {
  date: string;
  /** Un ResolvedDish por meal_id ya decidido, o null si ese slot no tiene dish (unresolved / no comido / comida de fuera). */
  resolvedByMealId: ReadonlyMap<string, ResolvedDish | null>;
}

export interface ReplayResult {
  accumulated: Map<string, number>;
  recentlyUsedIngredientIds: Set<string>;
  /** Stock virtual restante tras descontar lo consumido por cada día replayado, partiendo de `initialVirtualStock`. */
  virtualStock: Map<string, number>;
  /**
   * Snapshot de `accumulated` justo después de procesar cada día de `days`,
   * en el mismo orden (mismo índice). Para leer el status de un día
   * concreto dentro de la ventana replayada (ej. "Hoy" cuando `days` empieza
   * antes, en el inicio de la semana) sin tener que volver a llamar a
   * `replayAccumulation` acotando la ventana.
   */
  accumulatedByDay: Map<string, number>[];
}

/**
 * Reconstruye accumulated/recentlyUsedIngredientIds/virtualStock
 * recorriendo una secuencia de días **ya resueltos** (compromiso
 * `planned_meal` o hecho `meal_log`, según la regla de resolución del
 * ADR-0019/0022) — sin puntuar ni elegir nada, solo acumular con la misma
 * regla de corte diario/semanal y el mismo decremento de stock que usa
 * `generateMultiDayPlan` al generar.
 *
 * Dos usos (ADR-0019, "Acumulados y diversidad al generar de forma
 * perezosa"): sembrar la generación de un día nuevo detrás de días ya
 * comprometidos (pasando el resultado como `seed` de `generateMultiDayPlan`,
 * en vez de sembrar solo desde `contexts[0]`, que con horizonte rodante
 * puede estar a mitad de semana o dejar stock ya prometido sin descontar),
 * y recalcular `requirementStatuses`/diversidad de un día ya comprometido al
 * leerlo, sin fiarse del último resultado en memoria de una generación
 * anterior.
 *
 * `days` debe empezar en la fecha más antigua que pueda afectar a algún
 * `requirement` de `period = week` (su propio `weekPeriodStart`) — si
 * empieza más tarde, un acumulado semanal se leería incompleto.
 */
export function replayAccumulation(
  days: readonly ReplayDay[],
  requirements: readonly DietaryRequirement[],
  categoryIdsByIngredientId: ReadonlyMap<string, Set<string>>,
  initialVirtualStock: ReadonlyMap<string, number> = new Map(),
): ReplayResult {
  const accumulated = new Map<string, number>();
  const recentlyUsed = new Set<string>();
  const virtualStock = new Map(initialVirtualStock);
  const accumulatedByDay: Map<string, number>[] = [];

  days.forEach((day, dayIndex) => {
    if (dayIndex > 0) {
      const previousDate = days[dayIndex - 1]!.date;
      for (const req of requirementsNeedingReset(requirements, previousDate, day.date)) {
        accumulated.set(req.id, 0);
      }
    }

    for (const [mealId, resolved] of day.resolvedByMealId) {
      if (!resolved) continue;
      for (const req of requirements) {
        if (req.meal_id !== null && req.meal_id !== mealId) continue;
        const added = totalContribution(resolved, req, categoryIdsByIngredientId);
        accumulated.set(req.id, (accumulated.get(req.id) ?? 0) + added);
      }
      for (const component of resolved.components) {
        recentlyUsed.add(component.ingredient.id);
        const current = virtualStock.get(component.ingredient.id) ?? 0;
        virtualStock.set(component.ingredient.id, Math.max(0, current - component.quantity));
      }
    }

    accumulatedByDay.push(new Map(accumulated));
  });

  return { accumulated, recentlyUsedIngredientIds: recentlyUsed, virtualStock, accumulatedByDay };
}
