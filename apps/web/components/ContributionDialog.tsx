"use client";

import * as Dialog from "@radix-ui/react-dialog";
import { useMemo } from "react";
import type { Ingredient, RequirementStatus, ResolvedComponent } from "@meal-pilot/core";
import { IngredientThumb } from "./IngredientThumb";

/*
Diálogo de "quién contribuye" a un nutriente: barras de magnitud en un solo
tono de tinta (serie única, valores como texto), ver .meter-action. Compartido
entre el creador de platos (sobre el borrador en edición) y el chip de
cumplimiento de una dish ya guardada (sobre sus componentes fijos) — ambos le
pasan una lista de {ingredient, quantity}, sea borrador o ya persistida.
*/

export function ContributionDialog({
  status,
  components,
  onOpenChange,
}: {
  status: RequirementStatus | null;
  components: ResolvedComponent[];
  onOpenChange: (open: boolean) => void;
}) {
  const requirement = status?.requirement;
  const column = requirement?.scope_nutrient_column as keyof Ingredient | null;
  const rows = useMemo(() => {
    if (!column) return [];
    const result: { component: ResolvedComponent; value: number }[] = [];
    for (const c of components) {
      const perHundred = c.ingredient[column];
      const value = typeof perHundred === "number" ? (perHundred * c.quantity) / 100 : 0;
      if (value > 0) result.push({ component: c, value });
    }
    return result.sort((a, b) => b.value - a.value);
  }, [components, column]);
  const maxValue = rows[0]?.value ?? 1;

  return (
    <Dialog.Root open={status !== null} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="dialog-overlay" />
        <Dialog.Content className="dialog-content">
          <Dialog.Title className="dialog-title">{requirement?.name ?? ""} — contribuciones</Dialog.Title>
          {rows.length === 0 ? (
            <p className="section-note">Ningún ingrediente del plato aporta este nutriente todavía.</p>
          ) : (
            <ul className="contrib-list">
              {rows.map(({ component, value }) => (
                <li key={component.ingredient.id} className="contrib-row">
                  <span className="contrib-name">
                    <IngredientThumb ingredientId={component.ingredient.id} />
                    <span>{component.ingredient.name}</span>
                  </span>
                  <span className="contrib-track">
                    <span className="contrib-fill" style={{ width: `${(value / maxValue) * 100}%` }} />
                  </span>
                  <span className="contrib-value data-mono">
                    {value.toFixed(1)} {requirement?.unit}
                  </span>
                </li>
              ))}
            </ul>
          )}
          <div className="dialog-actions">
            <Dialog.Close asChild>
              <button type="button" className="btn-secondary">
                Cerrar
              </button>
            </Dialog.Close>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
