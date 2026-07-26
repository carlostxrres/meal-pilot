"use client";

import * as Checkbox from "@radix-ui/react-checkbox";
import { IconCheck } from "@tabler/icons-react";
import { useId, useState, useTransition } from "react";
import { confirmMealAction } from "@/app/(app)/actions";

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
  const id = useId();

  return (
    <div className="meal-confirm-row">
      <Checkbox.Root
        id={id}
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
        <Checkbox.Indicator className="checkbox-indicator">
          <IconCheck size={14} stroke={3} />
        </Checkbox.Indicator>
      </Checkbox.Root>
      <label htmlFor={id} className="meal-confirm-label">
        {checked ? "Comido" : "Marcar como comido"}
      </label>
    </div>
  );
}
