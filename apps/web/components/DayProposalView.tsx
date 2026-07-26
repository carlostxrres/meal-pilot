import { computeMealNutrition, type DayProposal } from "@meal-pilot/core";
import { IconAlertTriangle, IconFlask } from "@tabler/icons-react";
import { CapsuleMeter } from "./CapsuleMeter";
import { MealConfirmCheckbox } from "./MealConfirmCheckbox";
import { NutritionPopover } from "./NutritionPopover";

function formatTime(time: string): string {
  return time.slice(0, 5);
}

export function DayProposalView({
  proposal,
  label,
  confirmedMealIds,
  isToday,
}: {
  proposal: DayProposal;
  label: string;
  confirmedMealIds: Set<string>;
  isToday: boolean;
}) {
  return (
    <div>
      <p className="ticket-date">{label}</p>

      {proposal.meals.map((mealProposal) => (
        <section key={mealProposal.meal.id} className="meal-row">
          <div className="meal-row-head">
            <h2 className="ticket-header">{mealProposal.meal.name}</h2>
            <div className="meal-row-head-right">
              <span className="meal-time">
                {formatTime(mealProposal.meal.usual_start_time)}–{formatTime(mealProposal.meal.usual_end_time)}
              </span>
              {mealProposal.resolved && (
                <NutritionPopover totals={computeMealNutrition(mealProposal.resolved)} />
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
              <ul className="ingredient-list">
                {mealProposal.resolved.components.map((component, i) => (
                  <li key={i}>
                    <span>{component.ingredient.name}</span>
                    <span className="data-mono">
                      {component.quantity}
                      {component.ingredient.base_unit}
                    </span>
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

          {mealProposal.resolved && isToday && (
            <MealConfirmCheckbox
              date={proposal.date}
              mealId={mealProposal.meal.id}
              dishId={mealProposal.resolved.dish.id}
              initialConfirmed={confirmedMealIds.has(mealProposal.meal.id)}
            />
          )}
        </section>
      ))}

      <h3 className="section-title">Requisitos diarios</h3>
      {proposal.requirementStatuses
        .filter((status) => status.requirement.period === "day")
        .map((status) => (
          <CapsuleMeter key={status.requirement.id} status={status} />
        ))}

      <h3 className="section-title">Requisitos semanales</h3>
      {proposal.requirementStatuses
        .filter((status) => status.requirement.period === "week")
        .map((status) => (
          <CapsuleMeter key={status.requirement.id} status={status} />
        ))}
    </div>
  );
}
