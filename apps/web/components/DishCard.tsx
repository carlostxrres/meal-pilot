"use client";

import type { ReactNode } from "react";
import type { ResolvedComponent } from "@meal-pilot/core";
import { formatEur } from "@/lib/formatPrice";
import { IngredientRow } from "./IngredientRow";

/*
Tarjeta de un plato ("ticket"), compartida entre el catálogo de Platos
(DishCatalogList) y cada meal resuelto de "Hoy" (DayProposalView). Lo común
(nombre, tipo, precio, descripción, lista de ingredientes con IngredientRow)
vive aquí; lo que cambia por contexto entra por props:
  - `headerActions`: control extra en la esquina superior derecha — el
    botón de editar (DishCreator) en el catálogo, el NutritionPopover del
    meal resuelto en Hoy.
  - `meta`: bloque bajo la descripción — los chips de meal/cumplimiento en
    el catálogo; nada en Hoy (esa información no aporta ahí).
  - `children`: contenido tras la lista de ingredientes — en Hoy, los
    suplementos, el consejo del meal, la ventana nutricional y el checkbox
    de confirmar, todos dentro de la misma tarjeta (igual que antes de
    extraer este componente, en vez de sueltos fuera de ella).
*/

export interface DishCardDish {
  name: string;
  dish_type: string;
  description: string | null;
}

export default function DishCard({
  dish,
  components,
  price,
  headerActions,
  meta,
  children,
}: {
  dish: DishCardDish;
  components: ResolvedComponent[];
  price: number;
  headerActions?: ReactNode;
  meta?: ReactNode;
  children?: ReactNode;
}) {
  return (
    <div className="meal-row">
      <div className="meal-row-head">
        <p className="dish-name">{dish.name}</p>
        <div className="meal-row-head-right">
          <span className="meal-time">{dish.dish_type}</span>
          <span className="dish-price">{formatEur(price)}</span>
          {headerActions}
        </div>
      </div>

      {dish.description && <p className="dish-description">{dish.description}</p>}

      {meta}

      <ul className="dish-component-list">
        {components.map((component) => (
          <li key={component.ingredient.id}>
            <IngredientRow
              ingredient={component.ingredient}
              trailing={
                <span className="data-mono">
                  {component.quantity}
                  {component.ingredient.base_unit}
                </span>
              }
            />
          </li>
        ))}
      </ul>

      {children}
    </div>
  );
}
