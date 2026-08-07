import type { DietaryRequirement, DishCatalogEntry, Ingredient, Meal } from "@meal-pilot/core";
import DishCard from "./DishCard";
import { DishCardMenu } from "./DishCardMenu";

/** Ficha de un plato del catálogo, con su menú "...": la misma tarjeta en /dishes y en /dishes/:dishId. */
export function DishCatalogCard({
  entry,
  dishes,
  ingredients,
  meals,
  mealRequirements,
}: {
  entry: DishCatalogEntry;
  /** Catálogo completo — lo necesita DishCreator (vía el menú) para detectar colisiones al duplicar. */
  dishes: DishCatalogEntry[];
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
      dietType={entry.dietType}
      status={entry.dish.active ? "active" : "inactive"}
      headerActions={
        <DishCardMenu
          entry={entry}
          dishes={dishes}
          ingredients={ingredients}
          meals={meals}
          mealRequirements={mealRequirements}
        />
      }
    />
  );
}
