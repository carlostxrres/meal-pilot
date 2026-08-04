"use client";

import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import { IconDotsVertical, IconPencil, IconPlayerPlay, IconPlayerPause } from "@tabler/icons-react";
import { useState, useTransition } from "react";
import type { IngredientCatalogEntry } from "@meal-pilot/core";
import { setIngredientEnabledAction } from "@/app/(app)/actions";
import { IngredientCreator } from "./IngredientCreator";

/*
Menú "..." de la ficha de ingrediente, solo en el catálogo de Ingredientes
(/ingredients): editar y habilitar/deshabilitar. Editar abre un
IngredientCreator en modo controlado (mismo componente que "Nuevo
ingrediente", sin su propio trigger visible) — mismo patrón que
DishCardMenu, por el mismo motivo: anidar un Dialog.Trigger dentro de un
DropdownMenu.Item no funciona (el menú se desmonta antes de que el diálogo
llegue a abrirse), así que el item cierra el menú y abre el diálogo por
estado.
*/
export function IngredientCardMenu({ entry }: { entry: IngredientCatalogEntry }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [, startTransition] = useTransition();
  const enabled = entry.ingredient.enabled;

  function selectItem(action: () => void) {
    return (event: Event) => {
      event.preventDefault();
      setMenuOpen(false);
      action();
    };
  }

  return (
    <>
      <DropdownMenu.Root open={menuOpen} onOpenChange={setMenuOpen}>
        <DropdownMenu.Trigger asChild>
          <button type="button" className="icon-btn" aria-label={`Menú de ${entry.ingredient.name}`}>
            <IconDotsVertical size={18} stroke={1.75} />
          </button>
        </DropdownMenu.Trigger>
        <DropdownMenu.Portal>
          <DropdownMenu.Content className="select-content dropdown-content" align="end" sideOffset={4}>
            <DropdownMenu.Item
              className="select-item dropdown-item"
              onSelect={selectItem(() => setEditOpen(true))}
            >
              <IconPencil size={16} stroke={1.75} /> Editar ingrediente
            </DropdownMenu.Item>
            <DropdownMenu.Item
              className="select-item dropdown-item"
              onSelect={selectItem(() =>
                startTransition(() => {
                  void setIngredientEnabledAction(entry.ingredient.id, !enabled);
                }),
              )}
            >
              {enabled ? (
                <>
                  <IconPlayerPause size={16} stroke={1.75} /> Deshabilitar ingrediente
                </>
              ) : (
                <>
                  <IconPlayerPlay size={16} stroke={1.75} /> Habilitar ingrediente
                </>
              )}
            </DropdownMenu.Item>
          </DropdownMenu.Content>
        </DropdownMenu.Portal>
      </DropdownMenu.Root>

      <IngredientCreator existingEntry={entry} open={editOpen} onOpenChange={setEditOpen} />
    </>
  );
}
