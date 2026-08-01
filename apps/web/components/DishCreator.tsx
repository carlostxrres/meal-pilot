"use client";

import * as Dialog from "@radix-ui/react-dialog";
import * as Select from "@radix-ui/react-select";
import {
  IconBulb,
  IconCheck,
  IconChevronDown,
  IconEye,
  IconGripVertical,
  IconMinus,
  IconPencil,
  IconPlus,
  IconTrash,
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
import DishCard from "./DishCard";
import { IngredientRow } from "./IngredientRow";
import { IngredientThumb } from "./IngredientThumb";
import { InputNumber } from "./InputNumber";
import { NutritionalThresholds } from "./NutritionalThresholds";
import { SearchField } from "./SearchField";
import { SwipeableRow } from "./SwipeableRow";

/*
Intent: dar de alta (o editar) un plato fijo viendo EN VIVO si cae dentro de
la ventana nutricional de su comida (ADR-0017/0018), y su precio aproximado.
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

/** `prefillDish` precarga el borrador tanto para editar como para "nuevo plato similar". */
function initialCreatorState(prefillDish: DishCatalogEntry | undefined, meals: Meal[]): CreatorState {
  const ui = { query: "", error: null, inspectingId: null, suggestingId: null };
  if (prefillDish) {
    return {
      ...ui,
      name: prefillDish.dish.name,
      dishType: prefillDish.dish.dish_type,
      description: prefillDish.dish.description ?? "",
      mealId: prefillDish.dish.meal_id,
      components: prefillDish.components.map((c) => ({ ingredient: c.ingredient, quantity: c.quantity })),
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

/** Aviso de colisión parcial (mismo nombre o mismos ingredientes que un plato ya existente) — la ficha es de solo lectura, sin su menú "...". */
function CollisionDialog({
  collision,
  onKeepEditing,
  onCreateAnyway,
}: {
  collision: CollisionState | null;
  onKeepEditing: () => void;
  onCreateAnyway: () => void;
}) {
  return (
    <Dialog.Root open={collision !== null} onOpenChange={(o) => !o && onKeepEditing()}>
      <Dialog.Portal>
        <Dialog.Overlay className="dialog-overlay" />
        <Dialog.Content className="dialog-content">
          <Dialog.Title className="dialog-title">
            {collision?.type === "name"
              ? "Ya existe un plato con este nombre"
              : "Ya existe un plato con estos mismos ingredientes"}
          </Dialog.Title>
          {collision && (
            <DishCard
              dish={collision.match.dish}
              components={collision.match.components}
              price={collision.match.price}
              mealName={collision.match.mealName}
              complianceChecks={collision.match.compliance.checks}
              status={collision.match.dish.active ? "active" : "inactive"}
            />
          )}
          <div className="dialog-actions">
            <button type="button" className="btn-secondary" onClick={onKeepEditing}>
              Seguir editando plato
            </button>
            <button type="button" className="btn-primary" onClick={onCreateAnyway}>
              Crear igualmente
            </button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

/** Campos escalares del plato: nombre, tipo, descripción y comida. */
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
      <div className="field">
        <label htmlFor="dish-meal-trigger">Comida</label>
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
                  <Select.Item key={meal.id} value={meal.id} className="select-item select-item-with-check">
                    <Select.ItemIndicator className="select-item-indicator">
                      <IconCheck size={14} stroke={2} />
                    </Select.ItemIndicator>
                    <Select.ItemText>{meal.name}</Select.ItemText>
                  </Select.Item>
                ))}
              </Select.Viewport>
            </Select.Content>
          </Select.Portal>
        </Select.Root>
      </div>

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
            <SwipeableRow
              leftAction={{
                label: "Eliminar",
                icon: <IconTrash size={18} stroke={1.75} />,
                onTrigger: () => dispatch({ type: "remove-ingredient", ingredientId: component.ingredient.id }),
              }}
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
                        e.stopPropagation();
                        onDragStart(index);
                      }}
                    >
                      <IconGripVertical size={16} stroke={1.75} />
                    </button>
                    <InputNumber
                      value={component.quantity}
                      step={stepFor(component.ingredient)}
                      min={0}
                      ariaLabel={component.ingredient.name}
                      onChange={(quantity) =>
                        dispatch({ type: "set-quantity", ingredientId: component.ingredient.id, quantity })
                      }
                    />
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
            </SwipeableRow>
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
      <h3 className="section-title">Ventana nutricional</h3>
      <NutritionalThresholds
        statuses={liveStatuses}
        emptyMessage="Esta comida no tiene requisitos nutricionales definidos."
        renderActions={(status) => (
          <span className="meter-actions">
            <button
              type="button"
              className="meter-action"
              aria-label={`Ver contribuciones de ${status.requirement.name}`}
              onClick={() => dispatch({ type: "inspect", requirementId: status.requirement.id })}
            >
              <IconEye size={14} stroke={1.75} />
            </button>
            <button
              type="button"
              className="meter-action"
              aria-label={`Sugerencias para ${status.requirement.name}`}
              onClick={() => dispatch({ type: "suggest", requirementId: status.requirement.id })}
            >
              <IconBulb size={14} stroke={1.75} />
            </button>
          </span>
        )}
      />
      {allWithinWindow && (
        <p className="section-note" data-ok="true">
          Dentro de la ventana: listo para {isEditing ? "guardar" : "crear"}.
        </p>
      )}
      {children}
    </div>
  );
}

type CollisionType = "name" | "ingredients";
interface CollisionState {
  type: CollisionType;
  match: DishCatalogEntry;
}

export function DishCreator({
  ingredients,
  meals,
  mealRequirements,
  dishes,
  existingDish,
  duplicateFrom,
  trigger,
  open: controlledOpen,
  onOpenChange: setControlledOpen,
}: {
  ingredients: Ingredient[];
  meals: Meal[];
  mealRequirements: DietaryRequirement[];
  /** Catálogo completo, para detectar colisiones parciales al crear (mismo nombre / mismos ingredientes). */
  dishes: DishCatalogEntry[];
  /** Si se da, el diálogo edita este plato en vez de crear uno nuevo. */
  existingDish?: DishCatalogEntry;
  /** Si se da (y no hay existingDish), precarga un plato nuevo con esta base ("Nuevo plato similar"). */
  duplicateFrom?: DishCatalogEntry;
  /** Trigger propio (ej. un item de un dropdown menu); si se omite, usa el botón por defecto. */
  trigger?: React.ReactNode;
  /** Apertura controlada desde fuera (ej. un dropdown menu); si se omite, el diálogo gestiona su propio estado. */
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}) {
  const isEditing = existingDish != null;
  const prefillDish = existingDish ?? duplicateFrom;

  const [internalOpen, setInternalOpen] = useState(false);
  const isControlled = controlledOpen !== undefined;
  const open = isControlled ? controlledOpen : internalOpen;
  const setOpen = isControlled ? setControlledOpen! : setInternalOpen;
  const [submitting, setSubmitting] = useState(false);
  const [collision, setCollision] = useState<CollisionState | null>(null);
  const [state, dispatch] = useReducer(creatorReducer, undefined, () =>
    initialCreatorState(prefillDish, meals),
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

  // Cumplimiento en vivo del borrador contra la ventana de la comida elegida,
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
        active: true,
        created_at: "",
        updated_at: "",
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
    dispatch({ type: "reset", state: initialCreatorState(prefillDish, meals) });
  }

  // Colisiones parciales al crear un plato (no al editar uno existente: ahí
  // el propio plato "colisionaría" consigo mismo sin que sea un aviso útil).
  // Nombre y mismos ingredientes se comprueban por separado — "Crear
  // igualmente" reintenta solo con el tipo ya reconocido de por medio, así
  // que si hay colisión de los dos tipos a la vez, se avisa de ambas.
  function findCollision(skip: Set<CollisionType>): CollisionState | null {
    if (isEditing) return null;
    const candidates = dishes;
    if (!skip.has("name")) {
      const name = state.name.trim().toLowerCase();
      const match = candidates.find((d) => d.dish.name.trim().toLowerCase() === name);
      if (match) return { type: "name", match };
    }
    if (!skip.has("ingredients")) {
      const draftIds = new Set(state.components.map((c) => c.ingredient.id));
      const match = candidates.find((d) => {
        const ids = new Set(d.components.map((c) => c.ingredient.id));
        return ids.size === draftIds.size && [...draftIds].every((id) => ids.has(id));
      });
      if (match) return { type: "ingredients", match };
    }
    return null;
  }

  async function submitDish() {
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

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!canSubmit) return;
    const found = findCollision(new Set());
    if (found) {
      setCollision(found);
      return;
    }
    void submitDish();
  }

  function handleCreateAnyway() {
    if (!collision) return;
    const acknowledged = collision.type;
    setCollision(null);
    const stillFound = findCollision(new Set([acknowledged]));
    if (stillFound) {
      setCollision(stillFound);
      return;
    }
    void submitDish();
  }

  return (
    <Dialog.Root
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next && !isEditing) reset();
      }}
    >
      {trigger ? (
        <Dialog.Trigger asChild>{trigger}</Dialog.Trigger>
      ) : !isControlled ? (
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
      ) : null}
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
          <CollisionDialog
            collision={collision}
            onKeepEditing={() => setCollision(null)}
            onCreateAnyway={handleCreateAnyway}
          />
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
