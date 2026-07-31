"use client";

import { IconToolsKitchen2 } from "@tabler/icons-react";
import { useMemo, useState } from "react";
import type { DietaryRequirement, DishCatalogEntry, Ingredient, Meal } from "@meal-pilot/core";
import DishCard from "./DishCard";
import { DishCardMenu } from "./DishCardMenu";
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
  return (
    <DishCard
      dish={entry.dish}
      components={entry.components}
      price={entry.price}
      mealName={entry.mealName}
      complianceChecks={entry.compliance.checks}
      status={entry.dish.active ? "active" : "inactive"}
      headerActions={
        <DishCardMenu
          entry={entry}
          ingredients={ingredients}
          meals={meals}
          mealRequirements={mealRequirements}
        />
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
