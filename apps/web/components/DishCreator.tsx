"use client";

import * as Dialog from "@radix-ui/react-dialog";
import * as Select from "@radix-ui/react-select";
import {
  IconBulb,
  IconChevronDown,
  IconEye,
  IconGripVertical,
  IconMinus,
  IconPencil,
  IconPlus,
  IconX,
} from "@tabler/icons-react";
import { useEffect, useMemo, useReducer, useRef, useState, type Dispatch } from "react";
import {
  checkDishCompliance,
  computeDishPrice,
  sortByNutrientDisplayOrder,
  suggestForNutrient,
  type DietaryRequirement,
  type DishCatalogEntry,
  type DishSuggestion,
  type Ingredient,
  type Meal,
  type RequirementStatus,
} from "@meal-pilot/core";
import { createDishAction, updateDishAction } from "@/app/(app)/actions";
import { formatEur } from "@/lib/formatPrice";
import { CapsuleMeter } from "./CapsuleMeter";
import { IngredientRow } from "./IngredientRow";
import { IngredientThumb } from "./IngredientThumb";
import { SearchField } from "./SearchField";

/*
Intent: dar de alta (o editar) un plato fijo viendo EN VIVO si cae dentro de
la ventana nutricional de su meal (ADR-0017/0018), y su precio aproximado.
Layout pensado para minimizar scroll: los medidores + precio van en un
bloque sticky al fondo del diálogo (siempre visibles mientras se editan
ingredientes arriba), en su variante compacta de una línea. Cada nutriente
ofrece inspección (ojo: quién contribuye, barras de magnitud en un solo tono
de tinta — serie única, valores como texto) y sugerencias aplicables
(bombilla: añadir/reducir cantidades que llevan el nutriente a su ventana,
rankeadas por el efecto sobre el resto de nutrientes).

Un único componente sirve para crear y editar: si se pasa `existingDish`,
arranca precargado con sus datos, cambia el trigger por un lápiz, el título
y el botón de envío, y guarda con `updateDishAction` en vez de
`createDishAction`.

Las filas de ingrediente (ya añadidos, resultados de búsqueda) reutilizan el
componente compartido IngredientRow — misma estructura/tamaño/tooltip de
nutrición que Inventario y Compra, ver ese componente.

Todo el estado del borrador (campos del plato, ingredientes, búsqueda, error
y diálogos de inspección) vive en un reducer: las transiciones que tocan
varios campos a la vez (reset, añadir ingrediente, aplicar sugerencia) son
una sola acción. Solo lo transitorio (diálogo abierto, envío en curso,
arrastre) queda como useState.
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

interface CreatorState {
  name: string;
  dishType: string;
  description: string;
  mealId: string;
  components: DraftComponent[];
  query: string;
  error: string | null;
  inspectingId: string | null;
  suggestingId: string | null;
}

function initialCreatorState(existingDish: DishCatalogEntry | undefined, meals: Meal[]): CreatorState {
  const ui = { query: "", error: null, inspectingId: null, suggestingId: null };
  if (existingDish) {
    return {
      ...ui,
      name: existingDish.dish.name,
      dishType: existingDish.dish.dish_type,
      description: existingDish.dish.description ?? "",
      mealId: existingDish.dish.meal_id,
      components: existingDish.components.map((c) => ({ ingredient: c.ingredient, quantity: c.quantity })),
    };
  }
  return { ...ui, name: "", dishType: "", description: "", mealId: meals[0]?.id ?? "", components: [] };
}

type CreatorAction =
  | { type: "reset"; state: CreatorState }
  | { type: "set-field"; field: "name" | "dishType" | "description" | "mealId" | "query"; value: string }
  | { type: "add-ingredient"; ingredient: Ingredient }
  | { type: "set-quantity"; ingredientId: string; quantity: number }
  | { type: "remove-ingredient"; ingredientId: string }
  | { type: "reorder"; from: number; to: number }
  | { type: "apply-suggestion"; suggestion: DishSuggestion }
  | { type: "inspect"; requirementId: string | null }
  | { type: "suggest"; requirementId: string | null }
  | { type: "submit-start" }
  | { type: "submit-error"; error: string };

function creatorReducer(state: CreatorState, action: CreatorAction): CreatorState {
  switch (action.type) {
    case "reset":
      return action.state;
    case "set-field":
      return { ...state, [action.field]: action.value };
    case "add-ingredient":
      return {
        ...state,
        components: [
          ...state.components,
          { ingredient: action.ingredient, quantity: defaultQuantity(action.ingredient) },
        ],
        query: "",
      };
    case "set-quantity":
      return {
        ...state,
        components: state.components.map((c) =>
          c.ingredient.id === action.ingredientId ? { ...c, quantity: action.quantity } : c,
        ),
      };
    case "remove-ingredient":
      return {
        ...state,
        components: state.components.filter((c) => c.ingredient.id !== action.ingredientId),
      };
    case "reorder": {
      if (action.from === action.to) return state;
      const components = [...state.components];
      const [moved] = components.splice(action.from, 1);
      components.splice(action.to, 0, moved!);
      return { ...state, components };
    }
    case "apply-suggestion": {
      const { suggestion } = action;
      let components: DraftComponent[];
      if (suggestion.kind === "add") {
        const existing = state.components.some((c) => c.ingredient.id === suggestion.ingredient.id);
        components = existing
          ? state.components.map((c) =>
              c.ingredient.id === suggestion.ingredient.id
                ? { ...c, quantity: c.quantity + suggestion.quantity }
                : c,
            )
          : [...state.components, { ingredient: suggestion.ingredient, quantity: suggestion.quantity }];
      } else {
        components = state.components.flatMap((c) => {
          if (c.ingredient.id !== suggestion.ingredient.id) return [c];
          const remaining = c.quantity - suggestion.quantity;
          return remaining > 0 ? [{ ...c, quantity: remaining }] : [];
        });
      }
      return { ...state, components, suggestingId: null };
    }
    case "inspect":
      return { ...state, inspectingId: action.requirementId };
    case "suggest":
      return { ...state, suggestingId: action.requirementId };
    case "submit-start":
      return { ...state, error: null };
    case "submit-error":
      return { ...state, error: action.error };
  }
}

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
    const result: { component: DraftComponent; value: number }[] = [];
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
                  <IngredientRow
                    ingredient={suggestion.ingredient}
                    onClick={() => onApply(suggestion)}
                    meta={
                      <p className="suggestion-detail">
                        {suggestion.kind === "add" ? "Añadir" : "Reducir"}
                      </p>
                    }
                    trailing={
                      <span className="suggestion-qty data-mono">
                        {suggestion.kind === "add" ? (
                          <IconPlus size={13} stroke={2} />
                        ) : (
                          <IconMinus size={13} stroke={2} />
                        )}
                        {formatQuantity(suggestion.quantity)}
                        {suggestion.ingredient.base_unit}
                      </span>
                    }
                  />
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

/** Campos escalares del plato: nombre, tipo, descripción y meal. */
function DishDetailsFields({
  state,
  meals,
  dispatch,
}: {
  state: CreatorState;
  meals: Meal[];
  dispatch: Dispatch<CreatorAction>;
}) {
  return (
    <>
      <div className="creator-grid2">
        <div className="field">
          <label htmlFor="dish-name">Nombre</label>
          <input
            id="dish-name"
            type="text"
            value={state.name}
            onChange={(e) => dispatch({ type: "set-field", field: "name", value: e.target.value })}
            placeholder="Bowl de arroz con pollo"
            required
          />
        </div>
        <div className="field">
          <label htmlFor="dish-type">Tipo</label>
          <input
            id="dish-type"
            type="text"
            value={state.dishType}
            onChange={(e) => dispatch({ type: "set-field", field: "dishType", value: e.target.value })}
            placeholder="Ensalada, Bowl..."
          />
        </div>
      </div>

      <div className="field">
        <label htmlFor="dish-description">Descripción (opcional)</label>
        <textarea
          id="dish-description"
          className="creator-description"
          value={state.description}
          onChange={(e) => dispatch({ type: "set-field", field: "description", value: e.target.value })}
          placeholder="Notas de preparación, momento ideal para tomarlo..."
          rows={2}
        />
      </div>

      <div className="field">
        <label htmlFor="dish-meal-trigger">Meal</label>
        <Select.Root
          value={state.mealId}
          onValueChange={(value) => dispatch({ type: "set-field", field: "mealId", value })}
        >
          <Select.Trigger id="dish-meal-trigger" className="select-trigger dish-meal-trigger">
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
    </>
  );
}

/** Lista de ingredientes ya añadidos: reordenar arrastrando, cantidad +/- y quitar. */
function DraftComponentList({
  components,
  dragIndex,
  dragOverIndex,
  listRef,
  onDragStart,
  dispatch,
}: {
  components: DraftComponent[];
  dragIndex: number | null;
  dragOverIndex: number | null;
  listRef: React.RefObject<HTMLUListElement | null>;
  onDragStart: (index: number) => void;
  dispatch: Dispatch<CreatorAction>;
}) {
  function step(component: DraftComponent, direction: 1 | -1) {
    dispatch({
      type: "set-quantity",
      ingredientId: component.ingredient.id,
      quantity: Math.max(0, component.quantity + direction * stepFor(component.ingredient)),
    });
  }

  return (
    <ul className="creator-component-list" ref={listRef}>
      {components.map((component, index) => {
        const overMax =
          component.ingredient.max_quantity_per_dish != null &&
          component.quantity > component.ingredient.max_quantity_per_dish;
        return (
          <li
            key={component.ingredient.id}
            data-dragging={dragIndex === index || undefined}
            data-drag-over={(dragOverIndex === index && dragIndex !== index) || undefined}
          >
            <IngredientRow
              ingredient={component.ingredient}
              meta={
                overMax ? (
                  <p className="creator-max-warning">
                    Se ha superado el máximo recomendado de este ingrediente
                  </p>
                ) : undefined
              }
              trailing={
                <>
                  <button
                    type="button"
                    className="drag-handle"
                    aria-label={`Reordenar ${component.ingredient.name}`}
                    onPointerDown={(e) => {
                      e.preventDefault();
                      onDragStart(index);
                    }}
                  >
                    <IconGripVertical size={16} stroke={1.75} />
                  </button>
                  <button
                    type="button"
                    className="qty-step"
                    aria-label={`Restar ${stepFor(component.ingredient)}${component.ingredient.base_unit} de ${component.ingredient.name}`}
                    onClick={() => step(component, -1)}
                  >
                    <IconMinus size={13} stroke={2} />
                  </button>
                  <input
                    type="number"
                    className="creator-qty-input"
                    step="any"
                    min={0}
                    value={component.quantity}
                    onChange={(e) => {
                      // valueAsNumber es NaN con el campo vacío o a medio
                      // teclear; se guarda 0 (bloquea el envío: canSubmit
                      // exige cantidades > 0) en vez de propagar NaN.
                      const parsed = e.target.valueAsNumber;
                      dispatch({
                        type: "set-quantity",
                        ingredientId: component.ingredient.id,
                        quantity: Number.isFinite(parsed) ? parsed : 0,
                      });
                    }}
                    aria-label={`Cantidad de ${component.ingredient.name}`}
                  />
                  <button
                    type="button"
                    className="qty-step"
                    aria-label={`Sumar ${stepFor(component.ingredient)}${component.ingredient.base_unit} a ${component.ingredient.name}`}
                    onClick={() => step(component, 1)}
                  >
                    <IconPlus size={13} stroke={2} />
                  </button>
                  <span className="creator-component-unit">{component.ingredient.base_unit}</span>
                  <button
                    type="button"
                    className="creator-component-remove"
                    aria-label={`Quitar ${component.ingredient.name}`}
                    onClick={() => dispatch({ type: "remove-ingredient", ingredientId: component.ingredient.id })}
                  >
                    <IconX size={16} stroke={1.75} />
                  </button>
                </>
              }
            />
          </li>
        );
      })}
    </ul>
  );
}

/**
 * Bloque sticky del fondo del diálogo: precio + medidores compactos con
 * inspección/sugerencias por nutriente. `children` son los botones de
 * acción del formulario, que viven dentro del bloque para heredar el sticky.
 */
function CreatorMeters({
  livePrice,
  liveStatuses,
  isEditing,
  dispatch,
  children,
}: {
  livePrice: number;
  liveStatuses: RequirementStatus[];
  isEditing: boolean;
  dispatch: Dispatch<CreatorAction>;
  children: React.ReactNode;
}) {
  const allWithinWindow = liveStatuses.length > 0 && liveStatuses.every((s) => s.withinRange);

  return (
    <div className="creator-meters">
      <p className="creator-price">
        Precio aproximado: <strong className="data-mono">{formatEur(livePrice)}</strong>
      </p>
      <h3 className="section-title">Ventana nutricional del meal</h3>
      {liveStatuses.length === 0 ? (
        <p className="section-note">Este meal no tiene requisitos nutricionales definidos.</p>
      ) : (
        <>
          <div className="capsule-meter-grid">
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
                      onClick={() => dispatch({ type: "inspect", requirementId: status.requirement.id })}
                    >
                      <IconEye size={15} stroke={1.75} />
                    </button>
                    <button
                      type="button"
                      className="meter-action"
                      aria-label={`Sugerencias para ${status.requirement.name}`}
                      onClick={() => dispatch({ type: "suggest", requirementId: status.requirement.id })}
                    >
                      <IconBulb size={15} stroke={1.75} />
                    </button>
                  </span>
                }
              />
            ))}
          </div>
          {allWithinWindow && (
            <p className="section-note" data-ok="true">
              Dentro de la ventana: listo para {isEditing ? "guardar" : "crear"}.
            </p>
          )}
        </>
      )}
      {children}
    </div>
  );
}

export function DishCreator({
  ingredients,
  meals,
  mealRequirements,
  existingDish,
}: {
  ingredients: Ingredient[];
  meals: Meal[];
  mealRequirements: DietaryRequirement[];
  /** Si se da, el diálogo edita este plato en vez de crear uno nuevo. */
  existingDish?: DishCatalogEntry;
}) {
  const isEditing = existingDish != null;

  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [state, dispatch] = useReducer(creatorReducer, undefined, () =>
    initialCreatorState(existingDish, meals),
  );
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  const componentListRef = useRef<HTMLUListElement | null>(null);

  // Arrastrar para reordenar los ingredientes añadidos (pointer events, no
  // HTML5 drag-and-drop: no funciona en touch sin polyfill, y este creador
  // es de uso móvil). Durante el arrastre solo se resalta la fila objetivo;
  // el array se reordena de una vez al soltar.
  useEffect(() => {
    if (dragIndex === null) return;

    function indexAtPoint(clientY: number): number | null {
      const list = componentListRef.current;
      if (!list) return null;
      const rows = Array.from(list.children) as HTMLElement[];
      for (let i = 0; i < rows.length; i++) {
        const rect = rows[i]!.getBoundingClientRect();
        if (clientY < rect.top + rect.height / 2) return i;
      }
      return rows.length - 1;
    }

    function onMove(e: PointerEvent) {
      const target = indexAtPoint(e.clientY);
      if (target !== null) setDragOverIndex(target);
    }

    function onUp() {
      if (dragOverIndex !== null) dispatch({ type: "reorder", from: dragIndex!, to: dragOverIndex });
      setDragIndex(null);
      setDragOverIndex(null);
    }

    document.addEventListener("pointermove", onMove);
    document.addEventListener("pointerup", onUp);
    document.addEventListener("pointercancel", onUp);
    return () => {
      document.removeEventListener("pointermove", onMove);
      document.removeEventListener("pointerup", onUp);
      document.removeEventListener("pointercancel", onUp);
    };
  }, [dragIndex, dragOverIndex]);

  const pickerResults = useMemo(() => {
    const q = state.query.trim().toLowerCase();
    if (q === "") return [];
    const usedIds = new Set(state.components.map((c) => c.ingredient.id));
    return ingredients
      .filter((i) => !usedIds.has(i.id) && i.name.toLowerCase().includes(q))
      .slice(0, MAX_PICKER_RESULTS);
  }, [ingredients, state.components, state.query]);

  // Cumplimiento en vivo del borrador contra la ventana del meal elegido,
  // presentado con la misma forma que un RequirementStatus para reutilizar
  // CapsuleMeter tal cual.
  const liveStatuses: RequirementStatus[] = useMemo(() => {
    if (!state.mealId) return [];
    const draft = {
      dish: {
        id: "draft",
        owner_id: "",
        name: state.name,
        dish_type: state.dishType,
        meal_id: state.mealId,
        description: null,
      },
      components: state.components.map((c) => ({ ingredient: c.ingredient, quantity: c.quantity })),
    };
    const statuses = checkDishCompliance(draft, mealRequirements).checks.map((check) => ({
      requirement: check.requirement,
      accumulated: check.value,
      effectiveMinimum: check.effectiveMinimum,
      effectiveMaximum: check.effectiveMaximum,
      withinRange: check.withinWindow,
    }));
    return sortByNutrientDisplayOrder(statuses);
  }, [state.name, state.dishType, state.mealId, state.components, mealRequirements]);

  const livePrice = useMemo(() => computeDishPrice({ components: state.components }), [state.components]);

  const inspecting = liveStatuses.find((s) => s.requirement.id === state.inspectingId) ?? null;
  const suggesting = liveStatuses.find((s) => s.requirement.id === state.suggestingId) ?? null;

  const canSubmit =
    !submitting &&
    state.name.trim() !== "" &&
    state.mealId !== "" &&
    state.components.length > 0 &&
    state.components.every((c) => c.quantity > 0);

  function reset() {
    dispatch({ type: "reset", state: initialCreatorState(existingDish, meals) });
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!canSubmit) return;
    setSubmitting(true);
    dispatch({ type: "submit-start" });
    const input = {
      name: state.name.trim(),
      dishType: state.dishType.trim() || "Otro",
      description: state.description.trim() || undefined,
      mealId: state.mealId,
      components: state.components.map((c) => ({
        ingredientId: c.ingredient.id,
        quantity: c.quantity,
      })),
    };
    try {
      const result = isEditing
        ? await updateDishAction(existingDish.dish.id, input)
        : await createDishAction(input);
      if (result.error) {
        dispatch({ type: "submit-error", error: result.error });
        return;
      }
      if (!isEditing) reset();
      setOpen(false);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog.Root
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next && !isEditing) reset();
      }}
    >
      <Dialog.Trigger asChild>
        {isEditing ? (
          <button type="button" className="dish-edit-btn" aria-label={`Editar ${existingDish.dish.name}`}>
            <IconPencil size={16} stroke={1.75} />
          </button>
        ) : (
          <button type="button" className="btn-primary dish-creator-trigger">
            <IconPlus size={16} stroke={2} /> Nuevo plato
          </button>
        )}
      </Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Overlay className="dialog-overlay" />
        <Dialog.Content className="dialog-content dish-creator-content">
          <Dialog.Title className="dialog-title">{isEditing ? "Editar plato" : "Nuevo plato"}</Dialog.Title>
          <form onSubmit={handleSubmit}>
            <DishDetailsFields state={state} meals={meals} dispatch={dispatch} />

            <div className="field">
              <label htmlFor="dish-ingredient-search">Ingredientes</label>
              {state.components.length > 0 && (
                <DraftComponentList
                  components={state.components}
                  dragIndex={dragIndex}
                  dragOverIndex={dragOverIndex}
                  listRef={componentListRef}
                  onDragStart={(index) => {
                    setDragIndex(index);
                    setDragOverIndex(index);
                  }}
                  dispatch={dispatch}
                />
              )}
              <SearchField
                id="dish-ingredient-search"
                value={state.query}
                onChange={(value) => dispatch({ type: "set-field", field: "query", value })}
                placeholder="Buscar ingrediente para añadir..."
              />
              {pickerResults.length > 0 && (
                <ul className="creator-picker-list">
                  {pickerResults.map((ingredient) => (
                    <li key={ingredient.id}>
                      <IngredientRow
                        ingredient={ingredient}
                        onClick={() => dispatch({ type: "add-ingredient", ingredient })}
                        trailing={<IconPlus size={16} stroke={2} className="creator-add-icon" />}
                      />
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {state.error && <p className="warning">{state.error}</p>}

            <CreatorMeters
              livePrice={livePrice}
              liveStatuses={liveStatuses}
              isEditing={isEditing}
              dispatch={dispatch}
            >
              <div className="dialog-actions">
                <Dialog.Close asChild>
                  <button type="button" className="btn-secondary">
                    Cancelar
                  </button>
                </Dialog.Close>
                <button type="submit" className="btn-primary" disabled={!canSubmit}>
                  {submitting
                    ? isEditing
                      ? "Guardando..."
                      : "Creando..."
                    : isEditing
                      ? "Guardar cambios"
                      : "Crear plato"}
                </button>
              </div>
            </CreatorMeters>
          </form>

          <ContributionDialog
            status={inspecting}
            components={state.components}
            onOpenChange={(o) => !o && dispatch({ type: "inspect", requirementId: null })}
          />
          <SuggestionDialog
            status={suggesting}
            components={state.components}
            mealRequirements={mealRequirements}
            catalog={ingredients}
            onApply={(suggestion) => dispatch({ type: "apply-suggestion", suggestion })}
            onOpenChange={(o) => !o && dispatch({ type: "suggest", requirementId: null })}
          />
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
