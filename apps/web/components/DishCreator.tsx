"use client";

import * as Dialog from "@radix-ui/react-dialog";
import * as Select from "@radix-ui/react-select";
import {
  IconBulb,
  IconChevronDown,
  IconEye,
  IconMinus,
  IconPlus,
  IconSearch,
  IconX,
} from "@tabler/icons-react";
import { useMemo, useState } from "react";
import {
  checkDishCompliance,
  suggestForNutrient,
  type DietaryRequirement,
  type DishSuggestion,
  type Ingredient,
  type Meal,
  type RequirementStatus,
} from "@meal-pilot/core";
import { createDishAction } from "@/app/(app)/actions";
import { CapsuleMeter } from "./CapsuleMeter";
import { IngredientThumb } from "./IngredientThumb";

/*
Intent: dar de alta una dish fija viendo EN VIVO si cae dentro de la ventana
nutricional de su meal (ADR-0017/0018). Layout pensado para minimizar scroll:
los medidores van en un bloque sticky al fondo del diálogo (siempre visibles
mientras se editan ingredientes arriba), en su variante compacta de una línea.
Cada nutriente ofrece inspección (ojo: quién contribuye, barras de magnitud en
un solo tono de tinta — serie única, valores como texto) y sugerencias
aplicables (bombilla: añadir/reducir cantidades que llevan el nutriente a su
ventana, rankeadas por el efecto sobre el resto de nutrientes).
*/

interface DraftComponent {
  ingredient: Ingredient;
  quantity: number;
}

function defaultQuantity(ingredient: Ingredient): number {
  return ingredient.base_unit === "unit" ? 1 : 50;
}

/** Paso de los botones +/- : 10 en g/ml (petición explícita), 1 en unidades. */
function stepFor(ingredient: Ingredient): number {
  return ingredient.base_unit === "unit" ? 1 : 10;
}

function formatQuantity(value: number): string {
  return (Math.round(value * 10) / 10).toString();
}

const MAX_PICKER_RESULTS = 8;

function ContributionDialog({
  status,
  components,
  onOpenChange,
}: {
  status: RequirementStatus | null;
  components: DraftComponent[];
  onOpenChange: (open: boolean) => void;
}) {
  const requirement = status?.requirement;
  const column = requirement?.scope_nutrient_column as keyof Ingredient | null;
  const rows = useMemo(() => {
    if (!column) return [];
    return components
      .map((c) => {
        const perHundred = c.ingredient[column];
        const value =
          typeof perHundred === "number" ? (perHundred * c.quantity) / 100 : 0;
        return { component: c, value };
      })
      .filter((r) => r.value > 0)
      .sort((a, b) => b.value - a.value);
  }, [components, column]);
  const maxValue = rows[0]?.value ?? 1;

  return (
    <Dialog.Root open={status !== null} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="dialog-overlay" />
        <Dialog.Content className="dialog-content">
          <Dialog.Title className="dialog-title">{requirement?.name ?? ""} — contribuciones</Dialog.Title>
          {rows.length === 0 ? (
            <p className="section-note">Ningún ingrediente de la dish aporta este nutriente todavía.</p>
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

function SuggestionDialog({
  status,
  components,
  mealRequirements,
  catalog,
  onApply,
  onOpenChange,
}: {
  status: RequirementStatus | null;
  components: DraftComponent[];
  mealRequirements: DietaryRequirement[];
  catalog: Ingredient[];
  onApply: (suggestion: DishSuggestion) => void;
  onOpenChange: (open: boolean) => void;
}) {
  const requirement = status?.requirement ?? null;
  const result = useMemo(
    () =>
      requirement
        ? suggestForNutrient(components, requirement, mealRequirements, catalog)
        : null,
    [components, requirement, mealRequirements, catalog],
  );

  return (
    <Dialog.Root open={status !== null} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="dialog-overlay" />
        <Dialog.Content className="dialog-content">
          <Dialog.Title className="dialog-title">{requirement?.name ?? ""} — sugerencias</Dialog.Title>
          {result?.status === "within" && (
            <p className="section-note" data-ok="true">
              Este nutriente ya está dentro del umbral recomendado.
            </p>
          )}
          {result && result.status !== "within" && result.suggestions.length === 0 && (
            <p className="section-note">
              No hay ninguna corrección razonable con el catálogo actual — ajusta cantidades a mano.
            </p>
          )}
          {result && result.suggestions.length > 0 && (
            <ul className="suggestion-list">
              {result.suggestions.map((suggestion) => (
                <li key={`${suggestion.kind}-${suggestion.ingredient.id}`}>
                  <button
                    type="button"
                    className="creator-picker-item"
                    onClick={() => onApply(suggestion)}
                  >
                    <span className="contrib-name">
                      <IngredientThumb ingredientId={suggestion.ingredient.id} />
                      <span>
                        {suggestion.kind === "add" ? "Añade" : "Reduce"}{" "}
                        <strong className="data-mono">
                          {formatQuantity(suggestion.quantity)}
                          {suggestion.ingredient.base_unit}
                        </strong>{" "}
                        de {suggestion.ingredient.name}
                      </span>
                    </span>
                    {suggestion.kind === "add" ? (
                      <IconPlus size={14} stroke={2} />
                    ) : (
                      <IconMinus size={14} stroke={2} />
                    )}
                  </button>
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
  const [inspectingId, setInspectingId] = useState<string | null>(null);
  const [suggestingId, setSuggestingId] = useState<string | null>(null);

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

  const inspecting = liveStatuses.find((s) => s.requirement.id === inspectingId) ?? null;
  const suggesting = liveStatuses.find((s) => s.requirement.id === suggestingId) ?? null;

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
    setInspectingId(null);
    setSuggestingId(null);
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

  function stepQuantity(component: DraftComponent, direction: 1 | -1) {
    const next = Math.max(0, component.quantity + direction * stepFor(component.ingredient));
    setQuantity(component.ingredient.id, next);
  }

  function removeIngredient(ingredientId: string) {
    setComponents((prev) => prev.filter((c) => c.ingredient.id !== ingredientId));
  }

  function applySuggestion(suggestion: DishSuggestion) {
    setComponents((prev) => {
      const existing = prev.find((c) => c.ingredient.id === suggestion.ingredient.id);
      if (suggestion.kind === "add") {
        return existing
          ? prev.map((c) =>
              c.ingredient.id === suggestion.ingredient.id
                ? { ...c, quantity: c.quantity + suggestion.quantity }
                : c,
            )
          : [...prev, { ingredient: suggestion.ingredient, quantity: suggestion.quantity }];
      }
      return prev.flatMap((c) => {
        if (c.ingredient.id !== suggestion.ingredient.id) return [c];
        const remaining = c.quantity - suggestion.quantity;
        return remaining > 0 ? [{ ...c, quantity: remaining }] : [];
      });
    });
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
        <Dialog.Content className="dialog-content dish-creator-content">
          <Dialog.Title className="dialog-title">Nueva dish</Dialog.Title>
          <form onSubmit={handleSubmit}>
            <div className="creator-grid2">
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
                  placeholder="Ensalada, Bowl..."
                />
              </div>
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
                      <IngredientThumb ingredientId={component.ingredient.id} />
                      <span className="creator-component-name">{component.ingredient.name}</span>
                      <button
                        type="button"
                        className="qty-step"
                        aria-label={`Restar ${stepFor(component.ingredient)}${component.ingredient.base_unit} de ${component.ingredient.name}`}
                        onClick={() => stepQuantity(component, -1)}
                      >
                        <IconMinus size={13} stroke={2} />
                      </button>
                      <input
                        type="number"
                        step="any"
                        min={0}
                        value={component.quantity}
                        onChange={(e) => setQuantity(component.ingredient.id, Number(e.target.value))}
                        aria-label={`Cantidad de ${component.ingredient.name}`}
                      />
                      <button
                        type="button"
                        className="qty-step"
                        aria-label={`Sumar ${stepFor(component.ingredient)}${component.ingredient.base_unit} a ${component.ingredient.name}`}
                        onClick={() => stepQuantity(component, 1)}
                      >
                        <IconPlus size={13} stroke={2} />
                      </button>
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
                        <span className="contrib-name">
                          <IngredientThumb ingredientId={ingredient.id} />
                          <span>{ingredient.name}</span>
                        </span>
                        <IconPlus size={14} stroke={2} />
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {error && <p className="warning">{error}</p>}

            <div className="creator-meters">
              <h3 className="section-title">Ventana nutricional del meal</h3>
              {liveStatuses.length === 0 ? (
                <p className="section-note">Este meal no tiene requisitos nutricionales definidos.</p>
              ) : (
                <>
                  {liveStatuses.map((status) => (
                    <CapsuleMeter
                      key={status.requirement.id}
                      status={status}
                      compact
                      actions={
                        <span className="meter-actions">
                          <button
                            type="button"
                            className="meter-action"
                            aria-label={`Ver contribuciones de ${status.requirement.name}`}
                            onClick={() => setInspectingId(status.requirement.id)}
                          >
                            <IconEye size={15} stroke={1.75} />
                          </button>
                          <button
                            type="button"
                            className="meter-action"
                            aria-label={`Sugerencias para ${status.requirement.name}`}
                            onClick={() => setSuggestingId(status.requirement.id)}
                          >
                            <IconBulb size={15} stroke={1.75} />
                          </button>
                        </span>
                      }
                    />
                  ))}
                  {allWithinWindow && (
                    <p className="section-note" data-ok="true">
                      Dentro de la ventana: lista para crear.
                    </p>
                  )}
                </>
              )}
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
            </div>
          </form>

          <ContributionDialog
            status={inspecting}
            components={components}
            onOpenChange={(o) => !o && setInspectingId(null)}
          />
          <SuggestionDialog
            status={suggesting}
            components={components}
            mealRequirements={mealRequirements}
            catalog={ingredients}
            onApply={(suggestion) => {
              applySuggestion(suggestion);
              setSuggestingId(null);
            }}
            onOpenChange={(o) => !o && setSuggestingId(null)}
          />
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
