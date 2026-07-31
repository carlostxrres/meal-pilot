"use client";

import * as Dialog from "@radix-ui/react-dialog";
import { useState } from "react";
import type { Ingredient } from "@meal-pilot/core";
import { InputNumber } from "./InputNumber";

/** Formulario en sí, separado para que su estado se reinicie cada vez que el diálogo se monta (Radix desmonta `Dialog.Content` al cerrar). */
function InventoryEditForm({
  ingredient,
  onOpenChange,
  onSave,
}: {
  ingredient: Ingredient;
  onOpenChange: (open: boolean) => void;
  onSave: (values: { office_inventory: number; home_inventory: number }) => void;
}) {
  const [office, setOffice] = useState(ingredient.office_inventory);
  const [home, setHome] = useState(ingredient.home_inventory);

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        onSave({ office_inventory: office, home_inventory: home });
        onOpenChange(false);
      }}
    >
      <div className="field">
        <label htmlFor={`office-${ingredient.id}`}>Oficina ({ingredient.base_unit})</label>
        <InputNumber
          id={`office-${ingredient.id}`}
          value={office}
          onChange={setOffice}
          min={0}
          step={ingredient.base_unit === "unit" ? 1 : 10}
          ariaLabel={`oficina de ${ingredient.name}`}
        />
      </div>
      <div className="field">
        <label htmlFor={`home-${ingredient.id}`}>Casa ({ingredient.base_unit})</label>
        <InputNumber
          id={`home-${ingredient.id}`}
          value={home}
          onChange={setHome}
          min={0}
          step={ingredient.base_unit === "unit" ? 1 : 10}
          ariaLabel={`casa de ${ingredient.name}`}
        />
      </div>
      <div className="dialog-actions">
        <Dialog.Close asChild>
          <button type="button" className="btn-secondary">
            Cancelar
          </button>
        </Dialog.Close>
        <button type="submit" className="btn-primary">
          Guardar
        </button>
      </div>
    </form>
  );
}

export function InventoryEditDialog({
  ingredient,
  open,
  onOpenChange,
  onSave,
}: {
  ingredient: Ingredient;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Optimista: se llama al enviar, antes de que la escritura real termine. */
  onSave: (values: { office_inventory: number; home_inventory: number }) => void;
}) {
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="dialog-overlay" />
        <Dialog.Content className="dialog-content">
          <Dialog.Title className="dialog-title">{ingredient.name}</Dialog.Title>
          <InventoryEditForm ingredient={ingredient} onOpenChange={onOpenChange} onSave={onSave} />
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
