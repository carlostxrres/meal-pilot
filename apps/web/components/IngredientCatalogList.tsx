"use client";

import { IconApple } from "@tabler/icons-react";
import { useMemo, useState } from "react";
import type { IngredientCatalogEntry } from "@meal-pilot/core";
import { CatalogSection } from "./CatalogSection";
import { FilterSelect } from "./FilterSelect";
import { IngredientCatalogCard } from "./IngredientCatalogCard";
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

export function IngredientCatalogList({ ingredients }: { ingredients: IngredientCatalogEntry[] }) {
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<SortKey>("name-asc");

  const filtered = useMemo(
    () =>
      ingredients
        .filter((entry) => entry.ingredient.name.toLowerCase().includes(query.trim().toLowerCase()))
        .sort(SORTERS[sort]),
    [ingredients, query, sort],
  );

  return (
    <div>
      <div className="inventory-controls">
        <SearchField value={query} onChange={setQuery} placeholder="Buscar ingrediente..." />
        <FilterSelect value={sort} onChange={setSort} options={SORT_OPTIONS} ariaLabel="Ordenar por" />
      </div>

      <CatalogSection
        icon={<IconApple size={16} stroke={2} />}
        title="Ingredientes del catálogo"
        items={filtered}
        emptyMessage="Ningún ingrediente coincide con este filtro."
        getKey={(entry) => entry.ingredient.id}
        renderItem={(entry) => <IngredientCatalogCard entry={entry} />}
      />
    </div>
  );
}
