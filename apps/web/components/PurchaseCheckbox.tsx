"use client";

import * as Checkbox from "@radix-ui/react-checkbox";
import { IconCheck, IconPhoto } from "@tabler/icons-react";
import { useRouter } from "next/navigation";
import { useId, useState, useTransition } from "react";
import { markPurchasedAction } from "../app/(app)/actions";
import { ingredientImageUrl } from "@/lib/ingredientImage";

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
  const [imageFailed, setImageFailed] = useState(false);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();
  const id = useId();

  return (
    <div className="shopping-row">
      {imageFailed ? (
        <div className="shopping-image shopping-image-placeholder">
          <IconPhoto size={18} stroke={1.5} />
        </div>
      ) : (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={ingredientImageUrl(ingredientId)}
          alt=""
          className="shopping-image"
          onError={() => setImageFailed(true)}
        />
      )}
      <label htmlFor={id} className="shopping-info">
        <p className="shopping-name">{name}</p>
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
