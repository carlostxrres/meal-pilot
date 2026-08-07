"use client";

import { IconApple } from "@tabler/icons-react";
import { useRouter } from "next/navigation";
import { useMemo, useOptimistic, useState, useTransition } from "react";
import type { IngredientCatalogEntry, ShoppingReason } from "@meal-pilot/core";
import { updateInventoryAction } from "@/app/(app)/actions";
import { CatalogSection } from "./CatalogSection";
import { FilterSelect } from "./FilterSelect";
import { IngredientCatalogRow, type InventoryPatch } from "./IngredientCatalogRow";
import { SearchField } from "./SearchField";

type SortKey = "name-asc" | "name-desc" | "created-desc" | "created-asc" | "updated-desc" | "updated-asc";

const SORT_OPTIONS: [SortKey, string][] = [
  ["name-asc", "Nombre (A-Z)"],
  ["name-desc", "Nombre (Z-A)"],
  ["created-desc", "Más recientes primero"],
  ["created-asc", "Más antiguos primero"],
  ["updated-desc", "Modificados hace menos"],
  ["updated-asc", "Modificados hace más"],
];

const SORTERS: Record<SortKey, (a: IngredientCatalogEntry, b: IngredientCatalogEntry) => number> = {
  "name-asc": (a, b) => a.ingredient.name.localeCompare(b.ingredient.name),
  "name-desc": (a, b) => b.ingredient.name.localeCompare(a.ingredient.name),
  "created-desc": (a, b) =>
    new Date(b.ingredient.created_at).getTime() - new Date(a.ingredient.created_at).getTime(),
  "created-asc": (a, b) =>
    new Date(a.ingredient.created_at).getTime() - new Date(b.ingredient.created_at).getTime(),
  "updated-desc": (a, b) =>
    new Date(b.ingredient.updated_at).getTime() - new Date(a.ingredient.updated_at).getTime(),
  "updated-asc": (a, b) =>
    new Date(a.ingredient.updated_at).getTime() - new Date(b.ingredient.updated_at).getTime(),
};

/** Sentinel de Radix Select (no admite value=""), representa "sin filtrar por esta propiedad". */
const ALL = "all";

type StockFilter = "all" | "out" | "in" | "home" | "office";
type PurchaseFilter = "all" | "needed";

const STOCK_OPTIONS: [StockFilter, string][] = [
  ["all", "Cualquier stock"],
  ["out", "Sin stock"],
  ["in", "Con stock"],
  ["home", "En casa"],
  ["office", "En la oficina"],
];

const PURCHASE_OPTIONS: [PurchaseFilter, string][] = [
  ["all", "Cualquier estado de compra"],
  ["needed", "Para comprar"],
];

function totalStock(entry: IngredientCatalogEntry): number {
  return entry.ingredient.office_inventory + entry.ingredient.home_inventory;
}

export function IngredientCatalogList({
  ingredients,
  shoppingReasonsById,
}: {
  ingredients: IngredientCatalogEntry[];
  shoppingReasonsById: Record<string, ShoppingReason[]>;
}) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<SortKey>("name-asc");
  const [stockFilter, setStockFilter] = useState<StockFilter>(ALL);
  const [purchaseFilter, setPurchaseFilter] = useState<PurchaseFilter>(ALL);

  // Optimista (React 19): la fila se actualiza al instante tras vaciar/editar
  // inventario; la escritura real + revalidación van en segundo plano.
  const [optimisticIngredients, applyPatch] = useOptimistic(
    ingredients,
    (state, patch: { id: string; values: InventoryPatch }) =>
      state.map((entry) =>
        entry.ingredient.id === patch.id
          ? { ...entry, ingredient: { ...entry.ingredient, ...patch.values } }
          : entry,
      ),
  );

  function updateInventory(ingredientId: string, values: InventoryPatch) {
    startTransition(async () => {
      applyPatch({ id: ingredientId, values });
      await updateInventoryAction({ ingredientId, ...values });
      router.refresh();
    });
  }

  const filtered = useMemo(
    () =>
      optimisticIngredients
        .filter((entry) => entry.ingredient.name.toLowerCase().includes(query.trim().toLowerCase()))
        .filter((entry) => {
          switch (stockFilter) {
            case "out":
              return totalStock(entry) <= 0;
            case "in":
              return totalStock(entry) > 0;
            case "home":
              return entry.ingredient.home_inventory > 0;
            case "office":
              return entry.ingredient.office_inventory > 0;
            default:
              return true;
          }
        })
        .filter(
          (entry) =>
            purchaseFilter === "all" || (shoppingReasonsById[entry.ingredient.id]?.length ?? 0) > 0,
        )
        .sort(SORTERS[sort]),
    [optimisticIngredients, query, sort, stockFilter, purchaseFilter, shoppingReasonsById],
  );

  return (
    <div>
      <div className="inventory-controls">
        <SearchField value={query} onChange={setQuery} placeholder="Buscar ingrediente..." />
        <FilterSelect value={sort} onChange={setSort} options={SORT_OPTIONS} ariaLabel="Ordenar por" />
      </div>

      <div className="dish-filters-row">
        <FilterSelect value={stockFilter} onChange={setStockFilter} options={STOCK_OPTIONS} ariaLabel="Filtrar por stock" />
        <FilterSelect
          value={purchaseFilter}
          onChange={setPurchaseFilter}
          options={PURCHASE_OPTIONS}
          ariaLabel="Filtrar por estado de compra"
        />
      </div>

      <CatalogSection
        icon={<IconApple size={16} stroke={2} />}
        title="Ingredientes del catálogo"
        items={filtered}
        emptyMessage="Ningún ingrediente coincide con este filtro."
        getKey={(entry) => entry.ingredient.id}
        renderItem={(entry) => (
          <IngredientCatalogRow
            entry={entry}
            shoppingReasons={shoppingReasonsById[entry.ingredient.id]}
            onUpdateInventory={updateInventory}
          />
        )}
      />
    </div>
  );
}
