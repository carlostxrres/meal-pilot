"use client";

import * as Select from "@radix-ui/react-select";
import { IconBox, IconChevronDown, IconCircleOff, IconPencil, IconTrash } from "@tabler/icons-react";
import { useRouter } from "next/navigation";
import { useMemo, useOptimistic, useState, useTransition } from "react";
import type { Ingredient } from "@meal-pilot/core";
import { updateInventoryAction } from "@/app/(app)/actions";
import { IngredientRow } from "./IngredientRow";
import { InventoryEditDialog } from "./InventoryEditDialog";
import { SearchField } from "./SearchField";
import { SwipeableRow } from "./SwipeableRow";

type SortKey = "qty-desc" | "qty-asc" | "name-asc" | "name-desc";
type InventoryPatch = { office_inventory: number; home_inventory: number };

const SORTERS: Record<SortKey, (a: Ingredient, b: Ingredient) => number> = {
  "qty-desc": (a, b) => totalStock(b) - totalStock(a),
  "qty-asc": (a, b) => totalStock(a) - totalStock(b),
  "name-asc": (a, b) => a.name.localeCompare(b.name),
  "name-desc": (a, b) => b.name.localeCompare(a.name),
};

function totalStock(i: Ingredient): number {
  return i.office_inventory + i.home_inventory;
}

function InventoryRow({
  ingredient,
  onUpdate,
}: {
  ingredient: Ingredient;
  onUpdate: (id: string, values: InventoryPatch) => void;
}) {
  const [editOpen, setEditOpen] = useState(false);

  return (
    <SwipeableRow
      leftAction={{
        label: "Vaciar",
        icon: <IconTrash size={18} stroke={1.75} />,
        onTrigger: () => onUpdate(ingredient.id, { office_inventory: 0, home_inventory: 0 }),
      }}
      rightAction={{
        label: "Editar",
        icon: <IconPencil size={18} stroke={1.75} />,
        onTrigger: () => setEditOpen(true),
      }}
    >
      <IngredientRow
        ingredient={ingredient}
        meta={
          <p className="inventory-qty">
            <span>
              Oficina <strong>{ingredient.office_inventory}</strong>
              {ingredient.base_unit}
            </span>
            <span>
              Casa <strong>{ingredient.home_inventory}</strong>
              {ingredient.base_unit}
            </span>
          </p>
        }
        trailing={
          <>
            <button
              type="button"
              className="inventory-edit-btn"
              aria-label={`Editar ${ingredient.name}`}
              onClick={() => setEditOpen(true)}
            >
              <IconPencil size={16} stroke={1.75} />
            </button>
            <InventoryEditDialog
              ingredient={ingredient}
              open={editOpen}
              onOpenChange={setEditOpen}
              onSave={(values) => onUpdate(ingredient.id, values)}
            />
          </>
        }
      />
    </SwipeableRow>
  );
}

export function InventoryList({ ingredients }: { ingredients: Ingredient[] }) {
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<SortKey>("qty-desc");
  const router = useRouter();
  const [, startTransition] = useTransition();

  // Optimista (React 19): la fila (y su sección En stock/Agotado) se
  // actualiza al instante; la escritura real + revalidación van en segundo
  // plano, sin bloquear la UI mientras tanto.
  const [optimisticIngredients, applyPatch] = useOptimistic(
    ingredients,
    (state, patch: { id: string; values: InventoryPatch }) =>
      state.map((i) => (i.id === patch.id ? { ...i, ...patch.values } : i)),
  );

  function updateInventory(ingredientId: string, values: InventoryPatch) {
    startTransition(async () => {
      applyPatch({ id: ingredientId, values });
      await updateInventoryAction({ ingredientId, ...values });
      router.refresh();
    });
  }

  const filtered = useMemo(
    () => optimisticIngredients.filter((i) => i.name.toLowerCase().includes(query.trim().toLowerCase())),
    [optimisticIngredients, query],
  );

  const inStock = useMemo(
    () => filtered.filter((i) => totalStock(i) > 0).sort(SORTERS[sort]),
    [filtered, sort],
  );
  const outOfStock = useMemo(
    () => filtered.filter((i) => totalStock(i) <= 0).sort(SORTERS[sort]),
    [filtered, sort],
  );

  return (
    <div>
      <div className="inventory-controls">
        <SearchField value={query} onChange={setQuery} placeholder="Buscar ingrediente..." />

        <Select.Root value={sort} onValueChange={(v) => setSort(v as SortKey)}>
          <Select.Trigger className="select-trigger" aria-label="Ordenar por">
            <Select.Value />
            <Select.Icon>
              <IconChevronDown size={14} stroke={2} />
            </Select.Icon>
          </Select.Trigger>
          <Select.Portal>
            <Select.Content className="select-content" position="popper" sideOffset={4}>
              <Select.Viewport>
                <Select.Item value="qty-desc" className="select-item">
                  <Select.ItemText>Cantidad (mayor a menor)</Select.ItemText>
                </Select.Item>
                <Select.Item value="qty-asc" className="select-item">
                  <Select.ItemText>Cantidad (menor a mayor)</Select.ItemText>
                </Select.Item>
                <Select.Item value="name-asc" className="select-item">
                  <Select.ItemText>Nombre (A-Z)</Select.ItemText>
                </Select.Item>
                <Select.Item value="name-desc" className="select-item">
                  <Select.ItemText>Nombre (Z-A)</Select.ItemText>
                </Select.Item>
              </Select.Viewport>
            </Select.Content>
          </Select.Portal>
        </Select.Root>
      </div>

      <h2 className="section-title">
        <IconBox size={14} stroke={2} /> En stock ({inStock.length})
      </h2>
      {inStock.length === 0 ? (
        <p className="inventory-empty">Nada en stock con este filtro.</p>
      ) : (
        inStock.map((i) => <InventoryRow key={i.id} ingredient={i} onUpdate={updateInventory} />)
      )}

      <h2 className="section-title">
        <IconCircleOff size={14} stroke={2} /> Agotado ({outOfStock.length})
      </h2>
      {outOfStock.length === 0 ? (
        <p className="inventory-empty">Nada agotado con este filtro.</p>
      ) : (
        outOfStock.map((i) => <InventoryRow key={i.id} ingredient={i} onUpdate={updateInventory} />)
      )}
    </div>
  );
}
