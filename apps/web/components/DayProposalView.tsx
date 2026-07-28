import {
  computeDinnerTargets,
  computeDishPrice,
  computeHomeToOfficeCarry,
  computeMealNutrition,
  computeOfficeToStreetGrab,
  pickDailyTip,
  sortByNutrientDisplayOrder,
  type DayProposal,
  type DinnerTarget,
  type MealCarryList,
  type MealTip,
  type RequirementStatus,
} from "@meal-pilot/core";
import { IconAlertTriangle, IconBike, IconBulb, IconFlask, IconMoon } from "@tabler/icons-react";
import { formatEur } from "@/lib/formatPrice";
import { CapsuleMeter } from "./CapsuleMeter";
import { IngredientRow } from "./IngredientRow";
import { MealConfirmCheckbox } from "./MealConfirmCheckbox";
import { NutritionPopover } from "./NutritionPopover";

function formatTime(time: string): string {
  return time.slice(0, 5);
}

function formatAmount(value: number): string {
  return (Math.round(value * 10) / 10).toString();
}

/** "A", "A y B", "A, B y C" — lista al estilo español, nunca con coma de Oxford. */
function joinSpanish(items: string[]): string {
  if (items.length <= 1) return items[0] ?? "";
  if (items.length === 2) return `${items[0]} y ${items[1]}`;
  return `${items.slice(0, -1).join(", ")} y ${items[items.length - 1]}`;
}

function carryBullet(list: MealCarryList): string {
  const parts = list.components.map(
    (c) => `${formatAmount(c.quantity)}${c.ingredient.base_unit} de ${c.ingredient.name}`,
  );
  return `Llevar ${joinSpanish(parts)} para ${list.meal.name.toLowerCase()}`;
}

/** "≥ 300 kcal", "0–25 g", "≤ 400 mg" o null si el objetivo ya quedó cubierto sin techo. */
function formatDinnerTarget(target: DinnerTarget): string | null {
  const unit = target.requirement.unit;
  const min = target.remainingMinimum;
  const max = target.remainingMaximum;
  if (min != null && min > 0 && max != null) return `${formatAmount(min)}–${formatAmount(max)} ${unit}`;
  if (min != null && min > 0) return `≥ ${formatAmount(min)} ${unit}`;
  if (max != null && max >= 0) return `≤ ${formatAmount(max)} ${unit}`;
  if (max != null) return `superado en ${formatAmount(-max)} ${unit}`;
  return null;
}

function MealRequirementsDetails({ statuses }: { statuses: RequirementStatus[] }) {
  if (statuses.length === 0) return null;
  const allWithin = statuses.every((status) => status.withinRange);
  return (
    <details className="meal-reqs">
      <summary>
        Ventana nutricional
        {!allWithin && <IconAlertTriangle size={14} stroke={1.75} className="meal-reqs-flag" />}
      </summary>
      {sortByNutrientDisplayOrder(statuses).map((status) => (
        <CapsuleMeter key={status.requirement.id} status={status} />
      ))}
    </details>
  );
}

/**
 * "Antes de salir, prepara lo siguiente" — qué llevar de un sitio a otro
 * (ver `commute.ts`). `prepBullet` es un aviso fijo adicional (ej. "prepara
 * el snack de media mañana"), solo lo usa el bloque casa→oficina.
 */
function CommuteSection({
  icon,
  title,
  prepBullet,
  carryLists,
  emptyText,
}: {
  icon: React.ReactNode;
  title: string;
  prepBullet?: string | null;
  carryLists: MealCarryList[];
  emptyText: string;
}) {
  const carryBullets = carryLists.map(carryBullet);
  const bullets = [...(prepBullet ? [prepBullet] : []), ...(carryBullets.length > 0 ? carryBullets : [emptyText])];

  return (
    <section className="commute-block">
      <h3 className="section-title">
        {icon} {title}
      </h3>
      <p className="section-note">Antes de salir, prepara lo siguiente:</p>
      <ul className="commute-list">
        {bullets.map((bullet) => (
          <li key={bullet}>{bullet}</li>
        ))}
      </ul>
    </section>
  );
}

export function DayProposalView({
  proposal,
  confirmedMealIds,
  tipsByMeal,
  isToday,
}: {
  proposal: DayProposal;
  confirmedMealIds: Set<string>;
  tipsByMeal: ReadonlyMap<string, MealTip[]>;
  isToday: boolean;
}) {
  const dinnerTargets = computeDinnerTargets(proposal.requirementStatuses);
  const homeToOfficeCarry = computeHomeToOfficeCarry(proposal);
  const officeToStreetGrab = computeOfficeToStreetGrab(proposal);
  // "Prepara el snack de media mañana": solo si ese meal (el segundo del
  // día, ver ADR-0001) tiene propuesta válida hoy.
  const middleSnack = proposal.meals[1];
  const prepMiddleSnackBullet =
    middleSnack?.resolved != null ? `Prepara el ${middleSnack.meal.name.toLowerCase()}` : null;

  return (
    <div>
      {proposal.meals.length > 1 && (
        <CommuteSection
          icon={<IconBike size={14} stroke={2} />}
          title="Commute: de casa a la oficina"
          prepBullet={prepMiddleSnackBullet}
          carryLists={homeToOfficeCarry}
          emptyText="Ningún ingrediente que llevar de casa hoy."
        />
      )}

      {proposal.meals.map((mealProposal, index) => {
        const tip = pickDailyTip(tipsByMeal, mealProposal.meal.id, proposal.date);
        const isLast = index === proposal.meals.length - 1;

        // El bloque se muestra en cuanto el último meal tiene propuesta (aunque
        // no haya nada que recoger en la oficina — ahí se ve el texto de
        // respaldo, igual que en el bloque casa→oficina); solo se omite si el
        // meal ni siquiera se resolvió ese día.
        return (
          <div key={mealProposal.meal.id}>
            {isLast && mealProposal.resolved && (
              <CommuteSection
                icon={<IconBike size={14} stroke={2} />}
                title="Commute: de la oficina a la calle"
                carryLists={officeToStreetGrab ? [officeToStreetGrab] : []}
                emptyText="Ningún ingrediente que llevar de la oficina hoy."
              />
            )}
            <section className="meal-row">
              <div className="meal-row-head">
                <h2 className="ticket-header">{mealProposal.meal.name}</h2>
                <div className="meal-row-head-right">
                  <span className="meal-time">
                    {formatTime(mealProposal.meal.usual_start_time)}–{formatTime(mealProposal.meal.usual_end_time)}
                  </span>
                  {mealProposal.resolved && (
                    <>
                      <span className="dish-price">{formatEur(computeDishPrice(mealProposal.resolved))}</span>
                      <NutritionPopover totals={computeMealNutrition(mealProposal.resolved)} />
                    </>
                  )}
                </div>
              </div>

              {!mealProposal.resolved ? (
                <p className="warning">
                  <IconAlertTriangle size={16} stroke={1.75} /> Sin propuesta válida: {mealProposal.unresolvedReason}
                </p>
              ) : (
                <>
                  <p className="dish-name">{mealProposal.resolved.dish.name}</p>
                  {mealProposal.resolved.dish.description && (
                    <p className="dish-description">{mealProposal.resolved.dish.description}</p>
                  )}
                  <ul className="dish-component-list">
                    {mealProposal.resolved.components.map((component) => (
                      <li key={component.ingredient.id}>
                        <IngredientRow
                          ingredient={component.ingredient}
                          trailing={
                            <span className="data-mono">
                              {component.quantity}
                              {component.ingredient.base_unit}
                            </span>
                          }
                        />
                      </li>
                    ))}
                  </ul>
                </>
              )}

              {mealProposal.supplements.map((supplement) => (
                <p key={supplement.id} className="supplement-note">
                  <IconFlask size={14} stroke={1.75} /> {supplement.name} ({supplement.relative_timing})
                </p>
              ))}

              {tip && (
                <p className="meal-tip">
                  <IconBulb size={14} stroke={1.75} /> {tip.text}
                </p>
              )}

              <MealRequirementsDetails
                statuses={proposal.requirementStatuses.filter(
                  (status) => status.requirement.meal_id === mealProposal.meal.id,
                )}
              />

              {mealProposal.resolved && isToday && (
                <MealConfirmCheckbox
                  date={proposal.date}
                  mealId={mealProposal.meal.id}
                  dishId={mealProposal.resolved.dish.id}
                  initialConfirmed={confirmedMealIds.has(mealProposal.meal.id)}
                />
              )}
            </section>
          </div>
        );
      })}

      <h3 className="section-title">
        <IconMoon size={14} stroke={2} /> Prepara tu cena
      </h3>
      <p className="section-note">
        Lo que queda de los objetivos diarios tras los 4 meals — la cena se cocina fuera de esta app.
      </p>
      <ul className="dinner-target-list">
        {dinnerTargets.map((target) => {
          const text = formatDinnerTarget(target);
          const exceeded = target.remainingMaximum != null && target.remainingMaximum < 0;
          return (
            <li key={target.requirement.id} data-covered={text === null} data-exceeded={exceeded}>
              <span>{target.requirement.name}</span>
              <span className="data-mono">{text ?? "cubierto"}</span>
            </li>
          );
        })}
      </ul>

      <h3 className="section-title">Requisitos semanales</h3>
      {proposal.requirementStatuses.flatMap((status) =>
        status.requirement.period === "week" ? [<CapsuleMeter key={status.requirement.id} status={status} />] : [],
      )}
    </div>
  );
}
