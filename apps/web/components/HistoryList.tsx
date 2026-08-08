"use client";

import type { HistoryDay, HistoryMealEntry } from "@meal-pilot/core";
import { useState } from "react";
import { MealLogAnswerButtons } from "./MealLogAnswerButtons";

function stateLabel(entry: HistoryMealEntry): string {
  switch (entry.state) {
    case "unanswered":
      return "Sin responder";
    case "followed_plan":
      return `Comiste: ${entry.loggedDishName}`;
    case "ate_out":
      return `Comiste fuera: ${entry.loggedDescription}`;
    case "denied":
      return "No comiste esto";
  }
}

function HistoryMealRow({ date, entry }: { date: string; entry: HistoryMealEntry }) {
  const [editing, setEditing] = useState(false);

  return (
    <div className="history-meal-row">
      <div>
        <strong>{entry.meal.name}</strong>
        {entry.plannedDishName && <span> — planeado: {entry.plannedDishName}</span>}
        {entry.plannedUnresolvedReason && <span> — sin propuesta ese día</span>}
      </div>
      <p className="history-meal-state">{stateLabel(entry)}</p>
      {editing ? (
        <MealLogAnswerButtons
          date={date}
          mealId={entry.meal.id}
          plannedDishId={entry.plannedDishId}
          plannedDishName={entry.plannedDishName}
          onAnswered={() => setEditing(false)}
        />
      ) : (
        <button type="button" className="btn-secondary" onClick={() => setEditing(true)}>
          Editar
        </button>
      )}
    </div>
  );
}

/** Compromiso vs hecho de días pasados, editable (ADR-0022). */
export function HistoryList({ days }: { days: HistoryDay[] }) {
  return (
    <div>
      {days.map((day) => (
        <div className="history-day" key={day.date}>
          <h3 className="section-title">{day.date}</h3>
          {day.meals.map((entry) => (
            <HistoryMealRow key={entry.meal.id} date={day.date} entry={entry} />
          ))}
        </div>
      ))}
    </div>
  );
}
