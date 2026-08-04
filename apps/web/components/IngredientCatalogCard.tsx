import { IconExternalLink } from "@tabler/icons-react";
import type { Ingredient, IngredientCatalogEntry } from "@meal-pilot/core";
import { formatEur } from "@/lib/formatPrice";
import { SUPERMARKET_LABELS } from "@/lib/supermarkets";
import { IngredientCardMenu } from "./IngredientCardMenu";
import { IngredientRow } from "./IngredientRow";

const STORAGE_LABELS: Record<Ingredient["storage_type"], string> = {
  pantry: "Despensa",
  fridge: "Nevera",
  freezer: "Congelador",
};

/** Ficha de un ingrediente del catálogo, con su menú "...": mismo patrón que DishCatalogCard sobre DishCard. */
export function IngredientCatalogCard({ entry }: { entry: IngredientCatalogEntry }) {
  const { ingredient, purchaseLinks } = entry;

  return (
    <div className="dish-row" data-inactive={!ingredient.enabled || undefined}>
      <div className="dish-row-head">
        <p className="dish-name">{ingredient.name}</p>
        <div className="dish-row-head-right">
          <span className="dish-status-badge" data-status={ingredient.enabled ? "active" : "inactive"}>
            {ingredient.enabled ? "Habilitado" : "Deshabilitado"}
          </span>
          <span className="dish-type-label">{STORAGE_LABELS[ingredient.storage_type]}</span>
          {ingredient.price_eur_per_100 != null && (
            <span className="dish-price">{formatEur(ingredient.price_eur_per_100)}</span>
          )}
          <IngredientCardMenu entry={entry} />
        </div>
      </div>

      {ingredient.description && <p className="dish-description">{ingredient.description}</p>}

      <IngredientRow ingredient={ingredient} />

      {purchaseLinks.length > 0 && (
        <div className="dish-meal-chips">
          {purchaseLinks.map((link) => (
            <a key={link.id} href={link.url} target="_blank" rel="noreferrer" className="chip">
              <IconExternalLink size={14} stroke={1.75} /> {SUPERMARKET_LABELS[link.supermarket]}
            </a>
          ))}
        </div>
      )}
    </div>
  );
}
