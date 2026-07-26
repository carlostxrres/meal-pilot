import type { DayProposal } from "@comida-diaria/core";

function formatTime(time: string): string {
  return time.slice(0, 5);
}

export function DayProposalView({ proposal }: { proposal: DayProposal }) {
  return (
    <div className="proposal">
      <p className="proposal-date">Propuesta del {proposal.date}</p>

      {proposal.meals.map((mealProposal) => (
        <section key={mealProposal.meal.id} className="meal">
          <h2>
            {mealProposal.meal.name}
            <span className="meal-time">
              {formatTime(mealProposal.meal.usual_start_time)}–{formatTime(mealProposal.meal.usual_end_time)}
            </span>
          </h2>

          {!mealProposal.resolved ? (
            <p className="warning">⚠ Sin propuesta válida: {mealProposal.unresolvedReason}</p>
          ) : (
            <>
              <p className="dish-name">{mealProposal.resolved.dish.name}</p>
              <ul className="ingredients">
                {mealProposal.resolved.components.map((component, i) => (
                  <li key={i}>
                    {component.ingredient.name}: {component.quantity}
                    {component.ingredient.base_unit}
                  </li>
                ))}
              </ul>
            </>
          )}

          {mealProposal.supplement && (
            <p className="supplement">
              Suplemento: {mealProposal.supplement.name} ({mealProposal.supplement.relative_timing})
            </p>
          )}
        </section>
      ))}

      <section className="requirements">
        <h2>Requisitos dietéticos del día</h2>
        <ul>
          {proposal.requirementStatuses.map((status) => (
            <li key={status.requirement.id} className={status.withinRange ? "ok" : "off"}>
              <span className="mark">{status.withinRange ? "✓" : "✗"}</span>{" "}
              {status.requirement.description ?? status.requirement.id}: {status.accumulated.toFixed(1)}{" "}
              {status.requirement.unit}
              {status.effectiveMinimum != null && ` (min ${status.effectiveMinimum.toFixed(1)})`}
              {status.effectiveMaximum != null && ` (max ${status.effectiveMaximum.toFixed(1)})`}
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
