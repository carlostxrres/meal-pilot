"use client";

import { IconAlertTriangle, IconCircleCheck, IconToolsKitchen2 } from "@tabler/icons-react";
import { useMemo, useState } from "react";
import type { DietaryRequirement, DishCatalogEntry, Ingredient, Meal } from "@meal-pilot/core";
import DishCard from "./DishCard";
import { DishCreator } from "./DishCreator";
import { SearchField } from "./SearchField";

function DishCatalogCard({
  entry,
  ingredients,
  meals,
  mealRequirements,
}: {
  entry: DishCatalogEntry;
  ingredients: Ingredient[];
  meals: Meal[];
  mealRequirements: DietaryRequirement[];
}) {
  const failing = entry.compliance.checks.filter((check) => !check.withinWindow);

  return (
    <DishCard
      dish={entry.dish}
      components={entry.components}
      price={entry.price}
      headerActions={
        <DishCreator
          ingredients={ingredients}
          meals={meals}
          mealRequirements={mealRequirements}
          existingDish={entry}
        />
      }
      meta={
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
      }
    />
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

  const filtered = useMemo(
    () => dishes.filter((d) => d.dish.name.toLowerCase().includes(query.trim().toLowerCase())),
    [dishes, query],
  );

  return (
    <div>
      <div className="inventory-controls">
        <SearchField value={query} onChange={setQuery} placeholder="Buscar plato..." />
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
            ingredients={ingredients}
            meals={meals}
            mealRequirements={mealRequirements}
          />
        ))
      )}
    </div>
  );
}
