"use client";

import * as Select from "@radix-ui/react-select";
import { IconBox, IconChevronDown, IconCircleOff, IconSearch } from "@tabler/icons-react";
import { useMemo, useState } from "react";
import type { Ingredient } from "@meal-pilot/core";
import { IngredientThumb } from "./IngredientThumb";
import { InventoryEditDialog } from "./InventoryEditDialog";

type SortKey = "qty-desc" | "qty-asc" | "name-asc" | "name-desc";

const SORTERS: Record<SortKey, (a: Ingredient, b: Ingredient) => number> = {
  "qty-desc": (a, b) => totalStock(b) - totalStock(a),
  "qty-asc": (a, b) => totalStock(a) - totalStock(b),
  "name-asc": (a, b) => a.name.localeCompare(b.name),
  "name-desc": (a, b) => b.name.localeCompare(a.name),
};

function totalStock(i: Ingredient): number {
  return i.office_inventory + i.home_inventory;
}

function IngredientRow({ ingredient }: { ingredient: Ingredient }) {
  return (
    <div className="ingredient-row">
      <IngredientThumb ingredientId={ingredient.id} />
      <div className="ingredient-row-info">
        <p className="ingredient-row-name">{ingredient.name}</p>
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
      </div>
      <InventoryEditDialog ingredient={ingredient} />
    </div>
  );
}

export function InventoryList({ ingredients }: { ingredients: Ingredient[] }) {
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<SortKey>("qty-desc");

  const filtered = useMemo(
    () => ingredients.filter((i) => i.name.toLowerCase().includes(query.trim().toLowerCase())),
    [ingredients, query],
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
        <div className="search-field">
          <IconSearch size={16} stroke={1.75} />
          <input
            type="text"
            placeholder="Buscar ingrediente..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>

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
        inStock.map((i) => <IngredientRow key={i.id} ingredient={i} />)
      )}

      <h2 className="section-title">
        <IconCircleOff size={14} stroke={2} /> Agotado ({outOfStock.length})
      </h2>
      {outOfStock.length === 0 ? (
        <p className="inventory-empty">Nada agotado con este filtro.</p>
      ) : (
        outOfStock.map((i) => <IngredientRow key={i.id} ingredient={i} />)
      )}
    </div>
  );
}
