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
  const [error, setError] = useState<string | null>(null);
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
          const previous = checked;
          setChecked(next);
          setError(null);
          startTransition(() => {
            confirmMealAction(date, mealId, dishId, next).then((result) => {
              // Confirmar ya descuenta inventario (ADR-0021): si la escritura
              // falla, hay que revertir el check optimista -- de lo contrario
              // la UI diría "comido" sin que el descuento haya ocurrido.
              if (result.error) {
                setChecked(previous);
                setError(result.error);
              }
            });
          });
        }}
      >
        <Checkbox.Indicator className="checkbox-indicator">
          <IconCheck size={16} stroke={3} />
        </Checkbox.Indicator>
      </Checkbox.Root>
      <label htmlFor={id} className="meal-confirm-label">
        {checked ? "Comido" : "Marcar como comido"}
      </label>
      {error && <p className="warning">{error}</p>}
    </div>
  );
}
