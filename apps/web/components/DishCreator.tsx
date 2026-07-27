"use client";

import * as Dialog from "@radix-ui/react-dialog";
import * as Select from "@radix-ui/react-select";
import { IconChevronDown, IconPlus, IconSearch, IconX } from "@tabler/icons-react";
import { useMemo, useState } from "react";
import {
  checkDishCompliance,
  type DietaryRequirement,
  type Ingredient,
  type Meal,
  type RequirementStatus,
} from "@meal-pilot/core";
import { createDishAction } from "@/app/(app)/actions";
import { CapsuleMeter } from "./CapsuleMeter";

/*
Intent: dar de alta una dish fija viendo EN VIVO si cae dentro de la ventana
nutricional de su meal (ADR-0017/0018) — el usuario ajusta cantidades hasta
que las cápsulas se ponen verdes, en vez de descubrirlo después en /dishes.
Reutiliza el signature CapsuleMeter: verde solo dentro del intervalo
aceptable (banda de tolerancia real), --off fuera.
*/

interface DraftComponent {
  ingredient: Ingredient;
  quantity: number;
}

function defaultQuantity(ingredient: Ingredient): number {
  return ingredient.base_unit === "unit" ? 1 : 50;
}

const MAX_PICKER_RESULTS = 8;

export function DishCreator({
  ingredients,
  meals,
  mealRequirements,
}: {
  ingredients: Ingredient[];
  meals: Meal[];
  mealRequirements: DietaryRequirement[];
}) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [dishType, setDishType] = useState("");
  const [mealId, setMealId] = useState(meals[0]?.id ?? "");
  const [components, setComponents] = useState<DraftComponent[]>([]);
  const [query, setQuery] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const pickerResults = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (q === "") return [];
    const usedIds = new Set(components.map((c) => c.ingredient.id));
    return ingredients
      .filter((i) => !usedIds.has(i.id) && i.name.toLowerCase().includes(q))
      .slice(0, MAX_PICKER_RESULTS);
  }, [ingredients, components, query]);

  // Cumplimiento en vivo del borrador contra la ventana del meal elegido,
  // presentado con la misma forma que un RequirementStatus para reutilizar
  // CapsuleMeter tal cual.
  const liveStatuses: RequirementStatus[] = useMemo(() => {
    if (!mealId) return [];
    const draft = {
      dish: { id: "draft", owner_id: "", name, dish_type: dishType, meal_id: mealId },
      components: components.map((c) => ({ ingredient: c.ingredient, quantity: c.quantity })),
    };
    return checkDishCompliance(draft, mealRequirements).checks.map((check) => ({
      requirement: check.requirement,
      accumulated: check.value,
      effectiveMinimum: check.effectiveMinimum,
      effectiveMaximum: check.effectiveMaximum,
      withinRange: check.withinWindow,
    }));
  }, [name, dishType, mealId, components, mealRequirements]);

  const allWithinWindow = liveStatuses.length > 0 && liveStatuses.every((s) => s.withinRange);
  const canSubmit =
    !submitting &&
    name.trim() !== "" &&
    mealId !== "" &&
    components.length > 0 &&
    components.every((c) => c.quantity > 0);

  function reset() {
    setName("");
    setDishType("");
    setMealId(meals[0]?.id ?? "");
    setComponents([]);
    setQuery("");
    setError(null);
  }

  function addIngredient(ingredient: Ingredient) {
    setComponents((prev) => [...prev, { ingredient, quantity: defaultQuantity(ingredient) }]);
    setQuery("");
  }

  function setQuantity(ingredientId: string, quantity: number) {
    setComponents((prev) =>
      prev.map((c) => (c.ingredient.id === ingredientId ? { ...c, quantity } : c)),
    );
  }

  function removeIngredient(ingredientId: string) {
    setComponents((prev) => prev.filter((c) => c.ingredient.id !== ingredientId));
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!canSubmit) return;
    setSubmitting(true);
    setError(null);
    const result = await createDishAction({
      name: name.trim(),
      dishType: dishType.trim() || "Otro",
      mealId,
      components: components.map((c) => ({
        ingredientId: c.ingredient.id,
        quantity: c.quantity,
      })),
    });
    setSubmitting(false);
    if (result.error) {
      setError(result.error);
      return;
    }
    reset();
    setOpen(false);
  }

  return (
    <Dialog.Root
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) reset();
      }}
    >
      <Dialog.Trigger asChild>
        <button type="button" className="btn-primary dish-creator-trigger">
          <IconPlus size={16} stroke={2} /> Nueva dish
        </button>
      </Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Overlay className="dialog-overlay" />
        <Dialog.Content className="dialog-content">
          <Dialog.Title className="dialog-title">Nueva dish</Dialog.Title>
          <form onSubmit={handleSubmit}>
            <div className="field">
              <label htmlFor="dish-name">Nombre</label>
              <input
                id="dish-name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Bowl de arroz con pollo"
                required
              />
            </div>

            <div className="field">
              <label htmlFor="dish-type">Tipo</label>
              <input
                id="dish-type"
                type="text"
                value={dishType}
                onChange={(e) => setDishType(e.target.value)}
                placeholder="Ensalada, Bowl, Sandwich..."
              />
            </div>

            <div className="field">
              <label id="dish-meal-label">Meal</label>
              <Select.Root value={mealId} onValueChange={setMealId}>
                <Select.Trigger className="select-trigger dish-meal-trigger" aria-labelledby="dish-meal-label">
                  <Select.Value />
                  <Select.Icon>
                    <IconChevronDown size={14} stroke={1.75} />
                  </Select.Icon>
                </Select.Trigger>
                <Select.Portal>
                  <Select.Content className="select-content" position="popper" sideOffset={4}>
                    <Select.Viewport>
                      {meals.map((meal) => (
                        <Select.Item key={meal.id} value={meal.id} className="select-item">
                          <Select.ItemText>{meal.name}</Select.ItemText>
                        </Select.Item>
                      ))}
                    </Select.Viewport>
                  </Select.Content>
                </Select.Portal>
              </Select.Root>
            </div>

            <div className="field">
              <label htmlFor="dish-ingredient-search">Ingredientes</label>
              {components.length > 0 && (
                <ul className="creator-component-list">
                  {components.map((component) => (
                    <li key={component.ingredient.id} className="creator-component-row">
                      <span className="creator-component-name">{component.ingredient.name}</span>
                      <input
                        type="number"
                        step="any"
                        min={0}
                        value={component.quantity}
                        onChange={(e) => setQuantity(component.ingredient.id, Number(e.target.value))}
                        aria-label={`Cantidad de ${component.ingredient.name}`}
                      />
                      <span className="creator-component-unit">{component.ingredient.base_unit}</span>
                      <button
                        type="button"
                        className="creator-component-remove"
                        aria-label={`Quitar ${component.ingredient.name}`}
                        onClick={() => removeIngredient(component.ingredient.id)}
                      >
                        <IconX size={16} stroke={1.75} />
                      </button>
                    </li>
                  ))}
                </ul>
              )}
              <div className="search-field">
                <IconSearch size={16} stroke={1.75} />
                <input
                  id="dish-ingredient-search"
                  type="text"
                  placeholder="Buscar ingrediente para añadir..."
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                />
              </div>
              {pickerResults.length > 0 && (
                <ul className="creator-picker-list">
                  {pickerResults.map((ingredient) => (
                    <li key={ingredient.id}>
                      <button
                        type="button"
                        className="creator-picker-item"
                        onClick={() => addIngredient(ingredient)}
                      >
                        <span>{ingredient.name}</span>
                        <IconPlus size={14} stroke={2} />
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <h3 className="section-title">Ventana nutricional del meal</h3>
            {liveStatuses.length === 0 ? (
              <p className="section-note">Este meal no tiene requisitos nutricionales definidos.</p>
            ) : (
              <>
                <p className="section-note" data-ok={allWithinWindow}>
                  {allWithinWindow
                    ? "Dentro de la ventana: lista para crear."
                    : "Añade o ajusta ingredientes hasta que todas las cápsulas estén en verde."}
                </p>
                {liveStatuses.map((status) => (
                  <CapsuleMeter key={status.requirement.id} status={status} />
                ))}
              </>
            )}

            {error && <p className="warning">{error}</p>}

            <div className="dialog-actions">
              <Dialog.Close asChild>
                <button type="button" className="btn-secondary">
                  Cancelar
                </button>
              </Dialog.Close>
              <button type="submit" className="btn-primary" disabled={!canSubmit}>
                {submitting ? "Creando..." : "Crear dish"}
              </button>
            </div>
          </form>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
