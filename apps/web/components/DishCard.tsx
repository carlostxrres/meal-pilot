"use client";

import type { ReactNode } from "react";
import type { DishComplianceCheck, ResolvedComponent } from "@meal-pilot/core";
import { formatEur } from "@/lib/formatPrice";
import { DishComplianceChip } from "./DishComplianceChip";
import { IngredientRow } from "./IngredientRow";

/*
Tarjeta de un plato ("ticket"), compartida entre el catálogo de Platos
(DishCatalogList) y cada meal resuelto de "Hoy" (DayProposalView). Lo común
(nombre, tipo, precio, descripción, chips de meal/cumplimiento, lista de
ingredientes con IngredientRow) vive aquí; lo que cambia por contexto entra
por props:
  - `headerActions`: control extra en la esquina superior derecha — el
    menú del plato (DishCreator, activar/desactivar...) en el catálogo, el
    NutritionPopover del meal resuelto en Hoy.
  - `mealName`/`complianceChecks`: para los chips de meal y de ventana
    nutricional, presentes en ambos contextos (catálogo y Hoy).
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
  mealName,
  complianceChecks,
  status,
  headerActions,
  children,
}: {
  dish: DishCardDish;
  components: ResolvedComponent[];
  price: number;
  /** Nombre del meal al que pertenece el plato — chip informativo. */
  mealName?: string | null;
  /** Cumplimiento del plato contra la ventana nutricional de su meal — chip de métricas. */
  complianceChecks?: DishComplianceCheck[];
  /** Activo/desactivado (solo se pasa en el catálogo de Platos). */
  status?: "active" | "inactive";
  headerActions?: ReactNode;
  children?: ReactNode;
}) {
  return (
    <div className="dish-row" data-inactive={status === "inactive" || undefined}>
      <div className="dish-row-head">
        <p className="dish-name">{dish.name}</p>
        <div className="dish-row-head-right">
          {status && (
            <span className="dish-status-badge" data-status={status}>
              {status === "active" ? "Activo" : "Desactivado"}
            </span>
          )}
          <span className="dish-type-label">{dish.dish_type}</span>
          <span className="dish-price">{formatEur(price)}</span>
          {headerActions}
        </div>
      </div>

      {dish.description && <p className="dish-description">{dish.description}</p>}

      {(mealName || (complianceChecks && complianceChecks.length > 0)) && (
        <div className="dish-meal-chips">
          {mealName && <span className="dish-meal-chip">{mealName}</span>}
          {complianceChecks && complianceChecks.length > 0 && (
            <DishComplianceChip checks={complianceChecks} />
          )}
        </div>
      )}

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
