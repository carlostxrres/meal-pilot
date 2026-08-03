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

/** Sentinel de Radix Select (no admite value=""), representa "sin filtrar por esta propiedad". */
const ALL = "all";

type StatusFilter = "all" | "active" | "inactive";
type ComplianceFilter = "all" | "compliant" | "non-compliant";

const STATUS_OPTIONS: [StatusFilter, string][] = [
  ["all", "Cualquier estado"],
  ["active", "Activos"],
  ["inactive", "Desactivados"],
];

const COMPLIANCE_OPTIONS: [ComplianceFilter, string][] = [
  ["all", "Cualquier cumplimiento"],
  ["compliant", "Dentro de ventana"],
  ["non-compliant", "Fuera de ventana"],
];

/** Un <Select> de filtro, mismo look que el de orden — evita repetir el boilerplate de Radix 4 veces en este archivo. */
function FilterSelect<T extends string>({
  value,
  onChange,
  options,
  ariaLabel,
}: {
  value: T;
  onChange: (value: T) => void;
  options: readonly [T, string][];
  ariaLabel: string;
}) {
  return (
    <Select.Root value={value} onValueChange={(v) => onChange(v as T)}>
      <Select.Trigger className="select-trigger" aria-label={ariaLabel}>
        <Select.Value />
        <Select.Icon>
          <IconChevronDown size={16} stroke={2} />
        </Select.Icon>
      </Select.Trigger>
      <Select.Portal>
        <Select.Content className="select-content" position="popper" sideOffset={4}>
          <Select.Viewport>
            {options.map(([optionValue, label]) => (
              <Select.Item key={optionValue} value={optionValue} className="select-item select-item-with-check">
                <Select.ItemIndicator className="select-item-indicator">
                  <IconCheck size={16} stroke={2} />
                </Select.ItemIndicator>
                <Select.ItemText>{label}</Select.ItemText>
              </Select.Item>
            ))}
          </Select.Viewport>
        </Select.Content>
      </Select.Portal>
    </Select.Root>
  );
}

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
  const [mealFilter, setMealFilter] = useState<string>(ALL);
  const [typeFilter, setTypeFilter] = useState<string>(ALL);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [complianceFilter, setComplianceFilter] = useState<ComplianceFilter>("all");
  const [minPrice, setMinPrice] = useState("");
  const [maxPrice, setMaxPrice] = useState("");

  const mealOptions = useMemo<[string, string][]>(
    () => [[ALL, "Cualquier comida"], ...meals.map((m): [string, string] => [m.id, m.name])],
    [meals],
  );
  const typeOptions = useMemo<[string, string][]>(() => {
    const types = [...new Set(dishes.map((d) => d.dish.dish_type.trim()).filter((t) => t !== ""))].sort((a, b) =>
      a.localeCompare(b),
    );
    return [[ALL, "Cualquier tipo"], ...types.map((t): [string, string] => [t, t])];
  }, [dishes]);

  const hasActiveFilters =
    query.trim() !== "" ||
    mealFilter !== ALL ||
    typeFilter !== ALL ||
    statusFilter !== "all" ||
    complianceFilter !== "all" ||
    minPrice.trim() !== "" ||
    maxPrice.trim() !== "";

  function clearFilters() {
    setQuery("");
    setMealFilter(ALL);
    setTypeFilter(ALL);
    setStatusFilter("all");
    setComplianceFilter("all");
    setMinPrice("");
    setMaxPrice("");
  }

  const filtered = useMemo(() => {
    const min = minPrice.trim() === "" ? null : Number(minPrice);
    const max = maxPrice.trim() === "" ? null : Number(maxPrice);
    return dishes
      .filter((d) => d.dish.name.toLowerCase().includes(query.trim().toLowerCase()))
      .filter((d) => mealFilter === ALL || d.dish.meal_id === mealFilter)
      .filter((d) => typeFilter === ALL || d.dish.dish_type === typeFilter)
      .filter((d) => statusFilter === "all" || d.dish.active === (statusFilter === "active"))
      .filter((d) => complianceFilter === "all" || d.compliance.compliant === (complianceFilter === "compliant"))
      .filter((d) => min == null || Number.isNaN(min) || d.price >= min)
      .filter((d) => max == null || Number.isNaN(max) || d.price <= max)
      .sort(SORTERS[sort]);
  }, [dishes, query, sort, mealFilter, typeFilter, statusFilter, complianceFilter, minPrice, maxPrice]);

  return (
    <div>
      <div className="inventory-controls">
        <SearchField value={query} onChange={setQuery} placeholder="Buscar plato..." />

        <FilterSelect value={sort} onChange={setSort} options={SORT_OPTIONS} ariaLabel="Ordenar por" />
      </div>

      <div className="dish-filters-row">
        <FilterSelect value={mealFilter} onChange={setMealFilter} options={mealOptions} ariaLabel="Filtrar por comida" />
        <FilterSelect value={typeFilter} onChange={setTypeFilter} options={typeOptions} ariaLabel="Filtrar por tipo de plato" />
        <FilterSelect value={statusFilter} onChange={setStatusFilter} options={STATUS_OPTIONS} ariaLabel="Filtrar por estado" />
        <FilterSelect
          value={complianceFilter}
          onChange={setComplianceFilter}
          options={COMPLIANCE_OPTIONS}
          ariaLabel="Filtrar por cumplimiento nutricional"
        />
        <span className="price-range-field">
          <input
            type="number"
            inputMode="decimal"
            placeholder="Mín."
            aria-label="Precio mínimo"
            value={minPrice}
            onChange={(e) => setMinPrice(e.target.value)}
          />
          <span aria-hidden="true">–</span>
          <input
            type="number"
            inputMode="decimal"
            placeholder="Máx."
            aria-label="Precio máximo"
            value={maxPrice}
            onChange={(e) => setMaxPrice(e.target.value)}
          />
          <span aria-hidden="true">€</span>
        </span>
        {hasActiveFilters && (
          <button type="button" className="filters-clear" onClick={clearFilters}>
            Limpiar filtros
          </button>
        )}
      </div>

      <h2 className="section-title">
        <IconToolsKitchen2 size={16} stroke={2} /> Platos del catálogo ({filtered.length})
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
