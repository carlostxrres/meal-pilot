"use client";

import * as Select from "@radix-ui/react-select";
import { IconCheck, IconChevronDown, IconToolsKitchen2 } from "@tabler/icons-react";
import { useMemo, useState } from "react";
import type { DietaryRequirement, DishCatalogEntry, Ingredient, Meal } from "@meal-pilot/core";
import { DishCatalogCard } from "./DishCatalogCard";
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

const SORTERS: Record<SortKey, (a: DishCatalogEntry, b: DishCatalogEntry) => number> = {
  "name-asc": (a, b) => a.dish.name.localeCompare(b.dish.name),
  "name-desc": (a, b) => b.dish.name.localeCompare(a.dish.name),
  "created-desc": (a, b) => new Date(b.dish.created_at).getTime() - new Date(a.dish.created_at).getTime(),
  "created-asc": (a, b) => new Date(a.dish.created_at).getTime() - new Date(b.dish.created_at).getTime(),
  "updated-desc": (a, b) => new Date(b.dish.updated_at).getTime() - new Date(a.dish.updated_at).getTime(),
  "updated-asc": (a, b) => new Date(a.dish.updated_at).getTime() - new Date(b.dish.updated_at).getTime(),
};

export function DishCatalogList({
  dishes,
  ingredients,
  meals,
  mealRequirements,
}: {
  dishes: DishCatalogEntry[];
  ingredients: Ingredient[];
  meals: Meal[];
  mealRequirements: DietaryRequirement[];
}) {
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<SortKey>("name-asc");

  const filtered = useMemo(
    () =>
      dishes
        .filter((d) => d.dish.name.toLowerCase().includes(query.trim().toLowerCase()))
        .sort(SORTERS[sort]),
    [dishes, query, sort],
  );

  return (
    <div>
      <div className="inventory-controls">
        <SearchField value={query} onChange={setQuery} placeholder="Buscar plato..." />

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
                {SORT_OPTIONS.map(([value, label]) => (
                  <Select.Item key={value} value={value} className="select-item select-item-with-check">
                    <Select.ItemIndicator className="select-item-indicator">
                      <IconCheck size={14} stroke={2} />
                    </Select.ItemIndicator>
                    <Select.ItemText>{label}</Select.ItemText>
                  </Select.Item>
                ))}
              </Select.Viewport>
            </Select.Content>
          </Select.Portal>
        </Select.Root>
      </div>

      <h2 className="section-title">
        <IconToolsKitchen2 size={14} stroke={2} /> Platos del catálogo ({filtered.length})
      </h2>

      {filtered.length === 0 ? (
        <p className="inventory-empty">Ningún plato coincide con este filtro.</p>
      ) : (
        filtered.map((entry) => (
          <DishCatalogCard
            key={entry.dish.id}
            entry={entry}
            dishes={dishes}
            ingredients={ingredients}
            meals={meals}
            mealRequirements={mealRequirements}
          />
        ))
      )}
    </div>
  );
}
