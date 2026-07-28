"use client";

import * as Checkbox from "@radix-ui/react-checkbox";
import { IconCheck } from "@tabler/icons-react";
import { useId, useState } from "react";
import type { Ingredient } from "@meal-pilot/core";
import { IngredientRow } from "./IngredientRow";

export function PurchaseCheckbox({
  ingredient,
  reasonText,
  restockQuantity,
  onPurchase,
}: {
  ingredient: Ingredient;
  reasonText: string;
  restockQuantity: number;
  onPurchase: (ingredientId: string, restockQuantity: number) => void;
}) {
  const [purchased, setPurchased] = useState(false);
  const id = useId();

  return (
    <IngredientRow
      ingredient={ingredient}
      infoHtmlFor={id}
      meta={<p className="shopping-reason">{reasonText}</p>}
      trailing={
        <Checkbox.Root
          id={id}
          className="checkbox-root"
          checked={purchased}
          onCheckedChange={(value) => {
            if (value !== true) return;
            setPurchased(true);
            onPurchase(ingredient.id, restockQuantity);
          }}
        >
          <Checkbox.Indicator className="checkbox-indicator">
            <IconCheck size={14} stroke={3} />
          </Checkbox.Indicator>
        </Checkbox.Root>
      }
    />
  );
}
