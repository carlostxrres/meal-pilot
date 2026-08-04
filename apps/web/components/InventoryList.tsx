"use client";

import { IconBox, IconCircleOff, IconPencil, IconTrash } from "@tabler/icons-react";
import { useRouter } from "next/navigation";
import { useMemo, useOptimistic, useState, useTransition } from "react";
import type { Ingredient } from "@meal-pilot/core";
import { updateInventoryAction } from "@/app/(app)/actions";
import { CatalogSection } from "./CatalogSection";
import { FilterSelect } from "./FilterSelect";
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

        <FilterSelect
          value={sort}
          onChange={setSort}
          options={
            [
              ["qty-desc", "Cantidad (mayor a menor)"],
              ["qty-asc", "Cantidad (menor a mayor)"],
              ["name-asc", "Nombre (A-Z)"],
              ["name-desc", "Nombre (Z-A)"],
            ] as const
          }
          ariaLabel="Ordenar por"
        />
      </div>

      <CatalogSection
        icon={<IconBox size={16} stroke={2} />}
        title="En stock"
        items={inStock}
        emptyMessage="Nada en stock con este filtro."
        getKey={(i) => i.id}
        renderItem={(i) => <InventoryRow ingredient={i} onUpdate={updateInventory} />}
      />

      <CatalogSection
        icon={<IconCircleOff size={16} stroke={2} />}
        title="Agotado"
        items={outOfStock}
        emptyMessage="Nada agotado con este filtro."
        getKey={(i) => i.id}
        renderItem={(i) => <InventoryRow ingredient={i} onUpdate={updateInventory} />}
      />
    </div>
  );
}
