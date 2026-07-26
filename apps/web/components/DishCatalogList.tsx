"use client";

import { IconAlertTriangle, IconSearch, IconToolsKitchen2 } from "@tabler/icons-react";
import { useMemo, useState } from "react";
import type { DishCatalogEntry } from "@meal-pilot/core";

function DishCard({ entry }: { entry: DishCatalogEntry }) {
  return (
    <div className="meal-row">
      <div className="meal-row-head">
        <p className="dish-name">{entry.dish.name}</p>
        <span className="meal-time">{entry.dish.dish_type}</span>
      </div>

      {entry.mealNames.length > 0 ? (
        <div className="dish-meal-chips">
          {entry.mealNames.map((name) => (
            <span key={name} className="dish-meal-chip">
              {name}
            </span>
          ))}
        </div>
      ) : (
        <p className="warning">
          <IconAlertTriangle size={16} stroke={1.75} /> Sin vincular a ningún meal (nunca se propondrá)
        </p>
      )}

      <ul className="ingredient-list">
        {entry.components.map((component, i) => (
          <li key={i}>
            <span>
              {component.ingredientName ?? `Categoría: ${component.categoryName}`}
              {!component.required && " (opcional)"}
            </span>
            <span className="data-mono">
              {component.quantity}
              {component.quantityMax != null && `–${component.quantityMax}`}
              {component.unit ?? ""}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function DishCatalogList({ dishes }: { dishes: DishCatalogEntry[] }) {
  const [query, setQuery] = useState("");

  const filtered = useMemo(
    () => dishes.filter((d) => d.dish.name.toLowerCase().includes(query.trim().toLowerCase())),
    [dishes, query],
  );

  return (
    <div>
      <div className="inventory-controls">
        <div className="search-field">
          <IconSearch size={16} stroke={1.75} />
          <input
            type="text"
            placeholder="Buscar dish..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
      </div>

      <h2 className="section-title">
        <IconToolsKitchen2 size={14} stroke={2} /> Dishes del catálogo ({filtered.length})
      </h2>

      {filtered.length === 0 ? (
        <p className="inventory-empty">Ningún dish coincide con este filtro.</p>
      ) : (
        filtered.map((entry) => <DishCard key={entry.dish.id} entry={entry} />)
      )}
    </div>
  );
}
