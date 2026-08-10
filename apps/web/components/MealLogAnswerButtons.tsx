"use client";

import type { MealLogState } from "@meal-pilot/core";
import { useState, useTransition } from "react";
import { setMealLogStateAction } from "@/app/(app)/actions";
import styles from "./MealLogAnswerButtons.module.css";

/**
 * Los cuatro estados de un slot (date, meal_id), ADR-0022. "Comí otra cosa"
 * se registra siempre como texto libre (ate_out) -- elegir un plato
 * distinto del catálogo queda fuera de esta primera versión.
 */
export function MealLogAnswerButtons({
  date,
  mealId,
  plannedDishId,
  plannedDishName,
  onAnswered,
}: {
  date: string;
  mealId: string;
  plannedDishId: string | null;
  plannedDishName: string | null;
  onAnswered?: () => void;
}) {
  const [mode, setMode] = useState<"idle" | "ate_out">("idle");
  const [description, setDescription] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function submit(state: MealLogState, extra?: { description?: string }) {
    setError(null);
    startTransition(() => {
      setMealLogStateAction({
        date,
        mealId,
        state,
        dishId: state === "followed_plan" && plannedDishId ? plannedDishId : undefined,
        description: extra?.description,
      }).then((result) => {
        if (result.error) setError(result.error);
        else onAnswered?.();
      });
    });
  }

  if (mode === "ate_out") {
    return (
      <div className={styles['meal-log-answer']}>
        <input
          type="text"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="¿Qué comiste?"
          disabled={isPending}
        />
        <button
          type="button"
          className="btn-secondary"
          disabled={isPending || !description.trim()}
          onClick={() => submit("ate_out", { description: description.trim() })}
        >
          Guardar
        </button>
        <button type="button" className="btn-secondary" disabled={isPending} onClick={() => setMode("idle")}>
          Cancelar
        </button>
        {error && <p className="warning">{error}</p>}
      </div>
    );
  }

  return (
    <div className={styles['meal-log-answer']}>
      {plannedDishId && plannedDishName && (
        <button type="button" className="btn-primary" disabled={isPending} onClick={() => submit("followed_plan")}>
          Sí, comí {plannedDishName}
        </button>
      )}
      <button type="button" className="btn-secondary" disabled={isPending} onClick={() => setMode("ate_out")}>
        Comí otra cosa
      </button>
      <button type="button" className="btn-secondary" disabled={isPending} onClick={() => submit("denied")}>
        No comí
      </button>
      {error && <p className="warning">{error}</p>}
    </div>
  );
}
