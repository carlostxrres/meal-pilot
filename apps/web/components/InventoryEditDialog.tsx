"use client";

import * as Dialog from "@radix-ui/react-dialog";
import type { Ingredient } from "@meal-pilot/core";

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
          <form
            action={(formData) => {
              onSave({
                office_inventory: Number(formData.get("office_inventory")),
                home_inventory: Number(formData.get("home_inventory")),
              });
              onOpenChange(false);
            }}
          >
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
