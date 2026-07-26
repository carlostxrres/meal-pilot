"use client";

import * as Checkbox from "@radix-ui/react-checkbox";
import { IconCheck } from "@tabler/icons-react";
import { useRouter } from "next/navigation";
import { useId, useState, useTransition } from "react";
import { markPurchasedAction } from "../app/(app)/actions";
import { IngredientThumb } from "./IngredientThumb";

export function PurchaseCheckbox({
  ingredientId,
  name,
  reasonText,
  restockQuantity,
}: {
  ingredientId: string;
  name: string;
  reasonText: string;
  restockQuantity: number;
}) {
  const [purchased, setPurchased] = useState(false);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();
  const id = useId();

  return (
    <div className="ingredient-row">
      <IngredientThumb ingredientId={ingredientId} />
      <label htmlFor={id} className="ingredient-row-info shopping-info">
        <p className="ingredient-row-name">{name}</p>
        <p className="shopping-reason">{reasonText}</p>
      </label>
      <Checkbox.Root
        id={id}
        className="checkbox-root"
        checked={purchased}
        disabled={isPending}
        onCheckedChange={(value) => {
          if (value !== true) return;
          setPurchased(true);
          startTransition(async () => {
            await markPurchasedAction(ingredientId, restockQuantity);
            router.refresh();
          });
        }}
      >
        <Checkbox.Indicator className="checkbox-indicator">
          <IconCheck size={14} stroke={3} />
        </Checkbox.Indicator>
      </Checkbox.Root>
    </div>
  );
}
