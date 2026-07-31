"use client";

import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import {
  IconCopy,
  IconDotsVertical,
  IconPencil,
  IconPlayerPlay,
  IconPlayerPause,
} from "@tabler/icons-react";
import { useState, useTransition } from "react";
import type { DietaryRequirement, DishCatalogEntry, Ingredient, Meal } from "@meal-pilot/core";
import { setDishActiveAction } from "@/app/(app)/actions";
import { DishCreator } from "./DishCreator";

/*
Menú "..." del card de plato, solo en el catálogo de Platos (/dishes): editar,
duplicar como base de un plato nuevo, y activar/desactivar. Los dos primeros
abren un DishCreator en modo controlado (mismo componente que "Nuevo plato",
sin su propio trigger visible) — evita el problema conocido de anidar un
Dialog.Trigger dentro de un DropdownMenu.Item (el menú se desmonta antes de
que el diálogo llegue a abrirse); en vez de eso, el item cierra el menú y
abre el diálogo por estado, igual que UserMenu hace con su AlertDialog.
*/
export function DishCardMenu({
  entry,
  dishes,
  ingredients,
  meals,
  mealRequirements,
}: {
  entry: DishCatalogEntry;
  dishes: DishCatalogEntry[];
  ingredients: Ingredient[];
  meals: Meal[];
  mealRequirements: DietaryRequirement[];
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [duplicateOpen, setDuplicateOpen] = useState(false);
  const [, startTransition] = useTransition();
  const active = entry.dish.active;

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
          <button type="button" className="icon-btn" aria-label={`Menú de ${entry.dish.name}`}>
            <IconDotsVertical size={18} stroke={1.75} />
          </button>
        </DropdownMenu.Trigger>
        <DropdownMenu.Portal>
          <DropdownMenu.Content className="select-content dropdown-content" align="end" sideOffset={4}>
            <DropdownMenu.Item
              className="select-item dropdown-item"
              onSelect={selectItem(() => setEditOpen(true))}
            >
              <IconPencil size={16} stroke={1.75} /> Editar plato
            </DropdownMenu.Item>
            <DropdownMenu.Item
              className="select-item dropdown-item"
              onSelect={selectItem(() => setDuplicateOpen(true))}
            >
              <IconCopy size={16} stroke={1.75} /> Nuevo plato similar
            </DropdownMenu.Item>
            <DropdownMenu.Item
              className="select-item dropdown-item"
              onSelect={selectItem(() =>
                startTransition(() => {
                  void setDishActiveAction(entry.dish.id, !active);
                }),
              )}
            >
              {active ? (
                <>
                  <IconPlayerPause size={16} stroke={1.75} /> Desactivar plato
                </>
              ) : (
                <>
                  <IconPlayerPlay size={16} stroke={1.75} /> Activar plato
                </>
              )}
            </DropdownMenu.Item>
          </DropdownMenu.Content>
        </DropdownMenu.Portal>
      </DropdownMenu.Root>

      <DishCreator
        ingredients={ingredients}
        meals={meals}
        mealRequirements={mealRequirements}
        dishes={dishes}
        existingDish={entry}
        open={editOpen}
        onOpenChange={setEditOpen}
      />
      <DishCreator
        ingredients={ingredients}
        meals={meals}
        mealRequirements={mealRequirements}
        dishes={dishes}
        duplicateFrom={entry}
        open={duplicateOpen}
        onOpenChange={setDuplicateOpen}
      />
    </>
  );
}
