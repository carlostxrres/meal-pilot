"use client";

import * as Checkbox from "@radix-ui/react-checkbox";
import { useState, useTransition } from "react";
import { confirmMealAction } from "../app/(app)/actions";

export function MealConfirmCheckbox({
  date,
  mealId,
  dishId,
  initialConfirmed,
}: {
  date: string;
  mealId: string;
  dishId: string;
  initialConfirmed: boolean;
}) {
  const [checked, setChecked] = useState(initialConfirmed);
  const [isPending, startTransition] = useTransition();

  return (
    <div className="meal-confirm-row">
      <Checkbox.Root
        className="checkbox-root"
        checked={checked}
        disabled={isPending}
        onCheckedChange={(value) => {
          const next = value === true;
          setChecked(next);
          startTransition(() => {
            confirmMealAction(date, mealId, dishId, next);
          });
        }}
      >
        <Checkbox.Indicator className="checkbox-indicator">✓</Checkbox.Indicator>
      </Checkbox.Root>
      <span className="meal-confirm-label">{checked ? "Comido" : "Marcar como comido"}</span>
    </div>
  );
}
