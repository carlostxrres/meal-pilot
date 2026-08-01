"use client";

import * as Checkbox from "@radix-ui/react-checkbox";
import * as Dialog from "@radix-ui/react-dialog";
import { IconCheck } from "@tabler/icons-react";
import { useId, useState } from "react";
import type { Ingredient } from "@meal-pilot/core";
import { IngredientRow } from "./IngredientRow";
import { InputNumber } from "./InputNumber";

/** Formulario en sí, separado para que su estado se reinicie cada vez que el diálogo se monta (Radix desmonta `Dialog.Content` al cerrar). */
function PurchaseQuantityForm({
  ingredient,
  restockQuantity,
  onOpenChange,
  onConfirm,
}: {
  ingredient: Ingredient;
  restockQuantity: number;
  onOpenChange: (open: boolean) => void;
  onConfirm: (quantity: number) => void;
}) {
  const [quantity, setQuantity] = useState(restockQuantity);
  const unitLabel = ingredient.base_unit === "unit" ? "unidades" : ingredient.base_unit;

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        onConfirm(quantity);
        onOpenChange(false);
      }}
    >
      <div className="field">
        <label htmlFor={`purchase-qty-${ingredient.id}`}>Cantidad comprada ({unitLabel})</label>
        <InputNumber
          id={`purchase-qty-${ingredient.id}`}
          value={quantity}
          onChange={setQuantity}
          min={0}
          step={ingredient.base_unit === "unit" ? 1 : 10}
          ariaLabel={`cantidad comprada de ${ingredient.name}`}
        />
      </div>
      <div className="dialog-actions">
        <Dialog.Close asChild>
          <button type="button" className="btn-secondary">
            Cancelar
          </button>
        </Dialog.Close>
        <button type="submit" className="btn-primary" disabled={quantity <= 0}>
          Confirmar compra
        </button>
      </div>
    </form>
  );
}

export function PurchaseCheckbox({
  ingredient,
  reasonText,
  restockQuantity,
  onPurchase,
}: {
  ingredient: Ingredient;
  reasonText: string;
  restockQuantity: number;
  /** La cantidad la decide el usuario en el diálogo (prellenado con `restockQuantity`), no es fija. */
  onPurchase: (ingredient: Ingredient, quantity: number) => void;
}) {
  const [open, setOpen] = useState(false);
  const id = useId();

  return (
    <IngredientRow
      ingredient={ingredient}
      infoHtmlFor={id}
      meta={<p className="shopping-reason">{reasonText}</p>}
      trailing={
        <>
          <Checkbox.Root
            id={id}
            className="checkbox-root"
            checked={false}
            onCheckedChange={(value) => {
              if (value === true) setOpen(true);
            }}
          >
            <Checkbox.Indicator className="checkbox-indicator">
              <IconCheck size={14} stroke={3} />
            </Checkbox.Indicator>
          </Checkbox.Root>
          <Dialog.Root open={open} onOpenChange={setOpen}>
            <Dialog.Portal>
              <Dialog.Overlay className="dialog-overlay" />
              <Dialog.Content className="dialog-content">
                <Dialog.Title className="dialog-title">{ingredient.name}</Dialog.Title>
                <PurchaseQuantityForm
                  ingredient={ingredient}
                  restockQuantity={restockQuantity}
                  onOpenChange={setOpen}
                  onConfirm={(quantity) => onPurchase(ingredient, quantity)}
                />
              </Dialog.Content>
            </Dialog.Portal>
          </Dialog.Root>
        </>
      }
    />
  );
}
