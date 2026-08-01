import {
  checkDishCompliance,
  computeDinnerTargets,
  computeDishPrice,
  computeHomeToOfficeCarry,
  computeOfficeToStreetGrab,
  pickDailyTip,
  type DayProposal,
  type DietaryRequirement,
  type DinnerTarget,
  type MealCarryList,
  type MealTip,
} from "@meal-pilot/core";
import { IconAlertTriangle, IconBike, IconBulb, IconFlask, IconMoon, IconToolsKitchen2 } from "@tabler/icons-react";
import { CapsuleMeter } from "./CapsuleMeter";
import DishCard from "./DishCard";
import { MealConfirmCheckbox } from "./MealConfirmCheckbox";

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
    <section className="section">
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
  mealRequirements,
  isToday,
}: {
  proposal: DayProposal;
  confirmedMealIds: Set<string>;
  tipsByMeal: ReadonlyMap<string, MealTip[]>;
  /** Ventanas nutricionales por meal (ADR-0017) — para el chip de cumplimiento del plato del día. */
  mealRequirements: DietaryRequirement[];
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
      {proposal.meals.map((mealProposal, index) => {
        const tip = pickDailyTip(tipsByMeal, mealProposal.meal.id, proposal.date);
        const isSecond = index === 1;
        const isLast = index === proposal.meals.length - 1;

        // El bloque se muestra en cuanto el último meal tiene propuesta (aunque
        // no haya nada que recoger en la oficina — ahí se ve el texto de
        // respaldo, igual que en el bloque casa→oficina); solo se omite si el
        // meal ni siquiera se resolvió ese día.
        return (
          <div className="section" key={mealProposal.meal.id}>
            {/* Después de "Desayuno en casa" (el primer meal), no antes. */}
            {isSecond && (
              <CommuteSection
                icon={<IconBike size={14} stroke={2} />}
                title="Commute: de casa a la oficina"
                prepBullet={prepMiddleSnackBullet}
                carryLists={homeToOfficeCarry}
                emptyText="Ningún ingrediente que llevar de casa hoy."
              />
            )}
            {isLast && mealProposal.resolved && (
              <CommuteSection
                icon={<IconBike size={14} stroke={2} />}
                title="Commute: de la oficina a la calle"
                carryLists={officeToStreetGrab ? [officeToStreetGrab] : []}
                emptyText="Ningún ingrediente que llevar de la oficina hoy."
              />
            )}
            <h2 className="section-title">
              <IconToolsKitchen2 size={14} stroke={2} />
              {" "}
              {mealProposal.meal.name}
              {" "}
              ({formatTime(mealProposal.meal.usual_start_time)} - {formatTime(mealProposal.meal.usual_end_time)})
            </h2>

            {mealProposal.supplements.map((supplement) => (
              /*
                * to do: aquí irían solo los suplementos que se toman antes del meal
                * (ver supplement.relative_timing). Los que se toman después, irían
                * después del plato.
                */
              <p key={supplement.id} className="supplement-note">
                <IconFlask size={14} stroke={1.75} /> {supplement.name} ({supplement.relative_timing})
              </p>
            ))}
            {!mealProposal.resolved ? (
              <>
                <p className="warning">
                  <IconAlertTriangle size={16} stroke={1.75} /> Sin propuesta válida: {mealProposal.unresolvedReason}
                </p>
              </>
            ) : (
              <DishCard
                dish={mealProposal.resolved.dish}
                components={mealProposal.resolved.components}
                price={computeDishPrice(mealProposal.resolved)}
                mealName={mealProposal.meal.name}
                complianceChecks={checkDishCompliance(mealProposal.resolved, mealRequirements).checks}
                checkStock
              >
                {isToday && (
                  <MealConfirmCheckbox
                    date={proposal.date}
                    mealId={mealProposal.meal.id}
                    dishId={mealProposal.resolved.dish.id}
                    initialConfirmed={confirmedMealIds.has(mealProposal.meal.id)}
                  />
                )}
              </DishCard>
            )}

            {tip && (
              <p className="meal-tip">
                <IconBulb size={14} stroke={1.75} /> {tip.text}
              </p>
            )}

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
