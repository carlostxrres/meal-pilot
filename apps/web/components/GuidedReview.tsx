"use client";

import type { PendingReviewItem } from "@meal-pilot/core";
import { useState } from "react";
import { MealLogAnswerButtons } from "@/components/MealLogAnswerButtons";
import styles from "@/components/GuidedReview.module.css";

/**
 * Repaso guiado (ADR-0022): pregunta una a una las comidas "sin responder"
 * de los últimos PLANNING_HORIZON_DAYS días. Siempre saltable -- saltar no
 * escribe nada, el meal se queda "sin responder" y puede editarse más tarde
 * desde /historial.
 */
export function GuidedReview({ items }: { items: PendingReviewItem[] }) {
  const [index, setIndex] = useState(0);

  const remaining = items.slice(index);
  const current = remaining[0];
  if (!current) return null;

  return (
    <section className={`section ${styles['guided-review']}`}>
      <h3 className="section-title">Antes de seguir: ¿qué pasó con estas comidas?</h3>
      <p className="section-note">
        {current.date} — {current.meal.name}: ¿comiste {current.dishName}?
      </p>
      <MealLogAnswerButtons
        date={current.date}
        mealId={current.meal.id}
        plannedDishId={current.dishId}
        plannedDishName={current.dishName}
        onAnswered={() => setIndex((i) => i + 1)}
      />
      <button type="button" className={styles['guided-review-skip']} onClick={() => setIndex((i) => i + 1)}>
        Saltar
      </button>
      {remaining.length > 1 && <p className="section-note">Quedan {remaining.length - 1} más.</p>}
    </section>
  );
}
