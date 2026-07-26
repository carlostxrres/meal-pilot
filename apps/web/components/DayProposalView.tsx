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
  confirmedMealIds,
  isToday,
}: {
  proposal: DayProposal;
  confirmedMealIds: Set<string>;
  isToday: boolean;
}) {
  return (
    <div>
      <p className="ticket-date">{proposal.date}</p>

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

          {mealProposal.supplement && (
            <p className="supplement-note">
              <IconFlask size={14} stroke={1.75} /> {mealProposal.supplement.name} (
              {mealProposal.supplement.relative_timing})
            </p>
          )}

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

      <h3 className="section-title">Requisitos dietéticos del día</h3>
      {proposal.requirementStatuses.map((status) => (
        <CapsuleMeter key={status.requirement.id} status={status} />
      ))}
    </div>
  );
}
