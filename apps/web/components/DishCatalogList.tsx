"use client";

import { IconAlertTriangle, IconCircleCheck, IconSearch, IconToolsKitchen2 } from "@tabler/icons-react";
import { useMemo, useState } from "react";
import type { DishCatalogEntry } from "@meal-pilot/core";

function DishCard({ entry }: { entry: DishCatalogEntry }) {
  const failing = entry.compliance.checks.filter((check) => !check.withinWindow);

  return (
    <div className="meal-row">
      <div className="meal-row-head">
        <p className="dish-name">{entry.dish.name}</p>
        <span className="meal-time">{entry.dish.dish_type}</span>
      </div>

      <div className="dish-meal-chips">
        {entry.mealName && <span className="dish-meal-chip">{entry.mealName}</span>}
        {entry.compliance.checks.length > 0 &&
          (entry.compliance.compliant ? (
            <span className="dish-meal-chip" data-compliance="ok">
              <IconCircleCheck size={12} stroke={2} /> Dentro de la ventana del meal
            </span>
          ) : (
            <span className="dish-meal-chip" data-compliance="off">
              <IconAlertTriangle size={12} stroke={2} /> Fuera de ventana:{" "}
              {failing.map((check) => check.requirement.name).join(", ")}
            </span>
          ))}
      </div>

      <ul className="ingredient-list">
        {entry.components.map((component, i) => (
          <li key={i}>
            <span>{component.ingredientName}</span>
            <span className="data-mono">
              {component.quantity}
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
