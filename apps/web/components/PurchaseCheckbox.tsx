"use client";

import * as Checkbox from "@radix-ui/react-checkbox";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { markPurchasedAction } from "../app/(app)/actions";

export function PurchaseCheckbox({
  ingredientId,
  restockQuantity,
}: {
  ingredientId: string;
  restockQuantity: number;
}) {
  const [purchased, setPurchased] = useState(false);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  return (
    <Checkbox.Root
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
      <Checkbox.Indicator className="checkbox-indicator">✓</Checkbox.Indicator>
    </Checkbox.Root>
  );
}
