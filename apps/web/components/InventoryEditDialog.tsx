"use client";

import * as Dialog from "@radix-ui/react-dialog";
import { useState } from "react";
import type { Ingredient } from "@comida-diaria/core";
import { updateInventoryAction } from "../app/(app)/actions";

export function InventoryEditDialog({ ingredient }: { ingredient: Ingredient }) {
  const [open, setOpen] = useState(false);

  return (
    <Dialog.Root open={open} onOpenChange={setOpen}>
      <Dialog.Trigger asChild>
        <button type="button" className="inventory-edit-btn">
          Editar
        </button>
      </Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Overlay className="dialog-overlay" />
        <Dialog.Content className="dialog-content">
          <Dialog.Title className="dialog-title">{ingredient.name}</Dialog.Title>
          <form
            action={async (formData) => {
              await updateInventoryAction(formData);
              setOpen(false);
            }}
          >
            <input type="hidden" name="ingredientId" value={ingredient.id} />
            <div className="field">
              <label htmlFor={`office-${ingredient.id}`}>Oficina ({ingredient.base_unit})</label>
              <input
                id={`office-${ingredient.id}`}
                name="office_inventory"
                type="number"
                step="any"
                min={0}
                defaultValue={ingredient.office_inventory}
                required
              />
            </div>
            <div className="field">
              <label htmlFor={`home-${ingredient.id}`}>Casa ({ingredient.base_unit})</label>
              <input
                id={`home-${ingredient.id}`}
                name="home_inventory"
                type="number"
                step="any"
                min={0}
                defaultValue={ingredient.home_inventory}
                required
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
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
