import type { DietaryRequirement, DishCatalogEntry, Ingredient, Meal } from "@meal-pilot/core";
import DishCard from "./DishCard";
import { DishCardMenu } from "./DishCardMenu";

/**
 * Ficha de un plato del catálogo: la misma tarjeta en /dishes (con su menú
 * "...") y en /dishes/:dishId (vista de un plato suelto). `readonly` la
 * deja sin menú — para el futuro modal de colisiones al crear un plato, que
 * solo necesita mostrarla, no editarla.
 */
export function DishCatalogCard({
  entry,
  ingredients,
  meals,
  mealRequirements,
  readonly = false,
}: {
  entry: DishCatalogEntry;
  ingredients: Ingredient[];
  meals: Meal[];
  mealRequirements: DietaryRequirement[];
  readonly?: boolean;
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
        readonly ? undefined : (
          <DishCardMenu
            entry={entry}
            ingredients={ingredients}
            meals={meals}
            mealRequirements={mealRequirements}
          />
        )
      }
    />
  );
}
