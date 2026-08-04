"use client";

import * as Dialog from "@radix-ui/react-dialog";
import { IconPencil, IconPlus, IconX } from "@tabler/icons-react";
import { useReducer, useState, type Dispatch } from "react";
import {
  NUTRIENT_COLUMNS,
  SUPERMARKETS,
  type Ingredient,
  type IngredientCatalogEntry,
  type NutrientColumn,
  type Supermarket,
} from "@meal-pilot/core";
import { createIngredientAction, updateIngredientAction } from "@/app/(app)/actions";
import { SUPERMARKET_LABELS } from "@/lib/supermarkets";
import { FilterSelect } from "./FilterSelect";

/*
Intent: dar de alta (o editar) un ingrediente con todas sus propiedades:
identidad (nombre, descripción, unidad, almacenamiento), conservación por
método una vez abierto (ver ADR-0023), precio y tope por plato, valores
nutricionales, y links de compra online. A diferencia de DishCreator, este
formulario no tiene ventana nutricional que cumplir ni sugerencias — es
alta/edición de datos planos, así que no hace falta deshacer/rehacer ni
detección de colisiones.

`enabled` no se edita aquí, igual que `dish.active` no se edita dentro de
DishCreator: se cambia desde el menú "..." de la ficha (IngredientCardMenu),
no desde este formulario.

Un único componente sirve para crear y editar: si se pasa `existingEntry`,
arranca precargado con sus datos, cambia el trigger por un lápiz, el título
y el botón de envío, y guarda con `updateIngredientAction` en vez de
`createIngredientAction`.
*/

const BASE_UNIT_OPTIONS: [Ingredient["base_unit"], string][] = [
  ["g", "Gramos (g)"],
  ["ml", "Mililitros (ml)"],
  ["unit", "Unidades"],
];

const STORAGE_TYPE_OPTIONS: [Ingredient["storage_type"], string][] = [
  ["pantry", "Despensa"],
  ["fridge", "Nevera"],
  ["freezer", "Congelador"],
];

const RECOMMENDED_TIME_OPTIONS: [Ingredient["recommended_time"], string][] = [
  ["any", "Cualquier momento"],
  ["morning", "Mañana"],
  ["midday", "Mediodía"],
  ["afternoon", "Tarde"],
];

const SUPERMARKET_OPTIONS: [Supermarket, string][] = SUPERMARKETS.map((s) => [s, SUPERMARKET_LABELS[s]]);

const NUTRIENT_LABELS: Record<NutrientColumn, { label: string; unit: string }> = {
  kcal_per_100: { label: "Kcal", unit: "" },
  protein_g_per_100: { label: "Proteína", unit: "g" },
  carbs_g_per_100: { label: "Hidratos", unit: "g" },
  sugar_g_per_100: { label: "Azúcares", unit: "g" },
  fiber_g_per_100: { label: "Fibra", unit: "g" },
  fat_g_per_100: { label: "Grasas", unit: "g" },
  saturated_fat_g_per_100: { label: "Grasas saturadas", unit: "g" },
  sodium_mg_per_100: { label: "Sodio", unit: "mg" },
  vitamin_c_mg_per_100: { label: "Vitamina C", unit: "mg" },
  iron_mg_per_100: { label: "Hierro", unit: "mg" },
  calcium_mg_per_100: { label: "Calcio", unit: "mg" },
  omega3_g_per_100: { label: "Omega 3", unit: "g" },
};

interface DraftPurchaseLink {
  /** Solo para key de React (id real si venía de la BD, aleatorio si es nuevo) — no se envía tal cual al servidor. */
  id: string;
  supermarket: Supermarket;
  url: string;
}

type ScalarField =
  | "name"
  | "description"
  | "pantryShelfLifeDays"
  | "fridgeShelfLifeDays"
  | "freezerShelfLifeDays"
  | "priceEurPer100"
  | "maxQuantityPerDish";

interface CreatorState {
  name: string;
  description: string;
  baseUnit: Ingredient["base_unit"];
  storageType: Ingredient["storage_type"];
  recommendedTime: Ingredient["recommended_time"];
  pantryShelfLifeDays: string;
  fridgeShelfLifeDays: string;
  freezerShelfLifeDays: string;
  priceEurPer100: string;
  maxQuantityPerDish: string;
  nutrients: Record<NutrientColumn, string>;
  purchaseLinks: DraftPurchaseLink[];
  error: string | null;
}

function numberOrEmpty(value: number | null): string {
  return value == null ? "" : value.toString();
}

function initialCreatorState(existingEntry: IngredientCatalogEntry | undefined): CreatorState {
  if (!existingEntry) {
    return {
      name: "",
      description: "",
      baseUnit: "g",
      storageType: "pantry",
      recommendedTime: "any",
      pantryShelfLifeDays: "",
      fridgeShelfLifeDays: "",
      freezerShelfLifeDays: "",
      priceEurPer100: "",
      maxQuantityPerDish: "",
      nutrients: Object.fromEntries(NUTRIENT_COLUMNS.map((c) => [c, ""])) as Record<NutrientColumn, string>,
      purchaseLinks: [],
      error: null,
    };
  }
  const { ingredient, purchaseLinks } = existingEntry;
  return {
    name: ingredient.name,
    description: ingredient.description ?? "",
    baseUnit: ingredient.base_unit,
    storageType: ingredient.storage_type,
    recommendedTime: ingredient.recommended_time,
    pantryShelfLifeDays: numberOrEmpty(ingredient.pantry_shelf_life_days),
    fridgeShelfLifeDays: numberOrEmpty(ingredient.fridge_shelf_life_days),
    freezerShelfLifeDays: numberOrEmpty(ingredient.freezer_shelf_life_days),
    priceEurPer100: numberOrEmpty(ingredient.price_eur_per_100),
    maxQuantityPerDish: numberOrEmpty(ingredient.max_quantity_per_dish),
    nutrients: Object.fromEntries(
      NUTRIENT_COLUMNS.map((c) => [c, numberOrEmpty(ingredient[c])]),
    ) as Record<NutrientColumn, string>,
    purchaseLinks: purchaseLinks.map((l) => ({ id: l.id, supermarket: l.supermarket, url: l.url })),
    error: null,
  };
}

type CreatorAction =
  | { type: "reset"; state: CreatorState }
  | { type: "set-field"; field: ScalarField; value: string }
  | { type: "set-base-unit"; value: Ingredient["base_unit"] }
  | { type: "set-storage-type"; value: Ingredient["storage_type"] }
  | { type: "set-recommended-time"; value: Ingredient["recommended_time"] }
  | { type: "set-nutrient"; column: NutrientColumn; value: string }
  | { type: "add-purchase-link" }
  | { type: "set-purchase-link"; id: string; field: "supermarket" | "url"; value: string }
  | { type: "remove-purchase-link"; id: string }
  | { type: "submit-start" }
  | { type: "submit-error"; error: string };

function creatorReducer(state: CreatorState, action: CreatorAction): CreatorState {
  switch (action.type) {
    case "reset":
      return action.state;
    case "set-field":
      return { ...state, [action.field]: action.value };
    case "set-base-unit":
      return { ...state, baseUnit: action.value };
    case "set-storage-type":
      return { ...state, storageType: action.value };
    case "set-recommended-time":
      return { ...state, recommendedTime: action.value };
    case "set-nutrient":
      return { ...state, nutrients: { ...state.nutrients, [action.column]: action.value } };
    case "add-purchase-link":
      return {
        ...state,
        purchaseLinks: [
          ...state.purchaseLinks,
          { id: crypto.randomUUID(), supermarket: SUPERMARKETS[0], url: "" },
        ],
      };
    case "set-purchase-link":
      return {
        ...state,
        purchaseLinks: state.purchaseLinks.map((l) =>
          l.id === action.id ? { ...l, [action.field]: action.value } : l,
        ),
      };
    case "remove-purchase-link":
      return { ...state, purchaseLinks: state.purchaseLinks.filter((l) => l.id !== action.id) };
    case "submit-start":
      return { ...state, error: null };
    case "submit-error":
      return { ...state, error: action.error };
  }
}

function parseOptionalNumber(value: string): number | undefined {
  const trimmed = value.trim();
  if (trimmed === "") return undefined;
  const parsed = Number(trimmed);
  return Number.isFinite(parsed) ? parsed : undefined;
}

/** Nombre, descripción, unidad/almacenamiento/momento y conservación por método (ver ADR-0023). */
function IngredientIdentityFields({ state, dispatch }: { state: CreatorState; dispatch: Dispatch<CreatorAction> }) {
  return (
    <>
      <div className="field">
        <label htmlFor="ingredient-name">Nombre</label>
        <input
          id="ingredient-name"
          type="text"
          value={state.name}
          onChange={(e) => dispatch({ type: "set-field", field: "name", value: e.target.value })}
          placeholder="Atún en lata"
          required
        />
      </div>

      <div className="field">
        <label htmlFor="ingredient-description">Descripción (opcional)</label>
        <textarea
          id="ingredient-description"
          className="creator-description"
          value={state.description}
          onChange={(e) => dispatch({ type: "set-field", field: "description", value: e.target.value })}
          placeholder="Notas libres: marca, formato..."
          rows={2}
        />
      </div>

      <div className="creator-grid2">
        <div className="field">
          <label htmlFor="ingredient-base-unit">Unidad</label>
          <FilterSelect
            value={state.baseUnit}
            onChange={(value) => dispatch({ type: "set-base-unit", value })}
            options={BASE_UNIT_OPTIONS}
            ariaLabel="Unidad"
          />
        </div>
        <div className="field">
          <label htmlFor="ingredient-storage-type">Almacenamiento</label>
          <FilterSelect
            value={state.storageType}
            onChange={(value) => dispatch({ type: "set-storage-type", value })}
            options={STORAGE_TYPE_OPTIONS}
            ariaLabel="Almacenamiento"
          />
        </div>
      </div>

      <div className="field">
        <label htmlFor="ingredient-recommended-time">Momento recomendado</label>
        <FilterSelect
          value={state.recommendedTime}
          onChange={(value) => dispatch({ type: "set-recommended-time", value })}
          options={RECOMMENDED_TIME_OPTIONS}
          ariaLabel="Momento recomendado"
        />
      </div>

      <h3 className="section-title">Conservación una vez abierto (opcional, en días)</h3>
      <div className="creator-grid2">
        <div className="field">
          <label htmlFor="ingredient-pantry-shelf-life">Despensa</label>
          <input
            id="ingredient-pantry-shelf-life"
            type="number"
            inputMode="numeric"
            min={0}
            value={state.pantryShelfLifeDays}
            onChange={(e) => dispatch({ type: "set-field", field: "pantryShelfLifeDays", value: e.target.value })}
          />
        </div>
        <div className="field">
          <label htmlFor="ingredient-fridge-shelf-life">Nevera</label>
          <input
            id="ingredient-fridge-shelf-life"
            type="number"
            inputMode="numeric"
            min={0}
            value={state.fridgeShelfLifeDays}
            onChange={(e) => dispatch({ type: "set-field", field: "fridgeShelfLifeDays", value: e.target.value })}
          />
        </div>
      </div>
      <div className="field">
        <label htmlFor="ingredient-freezer-shelf-life">Congelador</label>
        <input
          id="ingredient-freezer-shelf-life"
          type="number"
          inputMode="numeric"
          min={0}
          value={state.freezerShelfLifeDays}
          onChange={(e) => dispatch({ type: "set-field", field: "freezerShelfLifeDays", value: e.target.value })}
        />
      </div>

      <div className="creator-grid2">
        <div className="field">
          <label htmlFor="ingredient-price">Precio aprox. (€ por 100{state.baseUnit === "unit" ? " uds" : state.baseUnit})</label>
          <input
            id="ingredient-price"
            type="number"
            inputMode="decimal"
            step="any"
            min={0}
            value={state.priceEurPer100}
            onChange={(e) => dispatch({ type: "set-field", field: "priceEurPer100", value: e.target.value })}
          />
        </div>
        <div className="field">
          <label htmlFor="ingredient-max-quantity">Tope por plato (opcional)</label>
          <input
            id="ingredient-max-quantity"
            type="number"
            inputMode="decimal"
            step="any"
            min={0}
            value={state.maxQuantityPerDish}
            onChange={(e) => dispatch({ type: "set-field", field: "maxQuantityPerDish", value: e.target.value })}
          />
        </div>
      </div>
    </>
  );
}

/** Los 12 valores nutricionales, todos opcionales, "por 100 unidad base" (ver ADR-0006). */
function NutrientFields({ state, dispatch }: { state: CreatorState; dispatch: Dispatch<CreatorAction> }) {
  return (
    <>
      <h3 className="section-title">Valores nutricionales (por 100{state.baseUnit === "unit" ? " unidades" : state.baseUnit}, opcional)</h3>
      <div className="creator-grid2">
        {NUTRIENT_COLUMNS.map((column) => (
          <div className="field" key={column}>
            <label htmlFor={`ingredient-nutrient-${column}`}>
              {NUTRIENT_LABELS[column].label}
              {NUTRIENT_LABELS[column].unit && ` (${NUTRIENT_LABELS[column].unit})`}
            </label>
            <input
              id={`ingredient-nutrient-${column}`}
              type="number"
              inputMode="decimal"
              step="any"
              min={0}
              value={state.nutrients[column]}
              onChange={(e) => dispatch({ type: "set-nutrient", column, value: e.target.value })}
            />
          </div>
        ))}
      </div>
    </>
  );
}

/** Links de compra online: supermercado (lista cerrada, ver ADR-0023) + URL, repetible. */
function PurchaseLinksFields({
  purchaseLinks,
  dispatch,
}: {
  purchaseLinks: DraftPurchaseLink[];
  dispatch: Dispatch<CreatorAction>;
}) {
  return (
    <div className="field">
      <label>Links de compra online (opcional)</label>
      {purchaseLinks.length > 0 && (
        <ul className="creator-component-list">
          {purchaseLinks.map((link) => (
            <li key={link.id}>
              <div className="creator-grid2">
                <FilterSelect
                  value={link.supermarket}
                  onChange={(value) => dispatch({ type: "set-purchase-link", id: link.id, field: "supermarket", value })}
                  options={SUPERMARKET_OPTIONS}
                  ariaLabel="Supermercado"
                />
                <input
                  type="url"
                  value={link.url}
                  onChange={(e) =>
                    dispatch({ type: "set-purchase-link", id: link.id, field: "url", value: e.target.value })
                  }
                  placeholder="https://..."
                  aria-label="URL de compra"
                />
              </div>
              <button
                type="button"
                className="creator-component-remove"
                aria-label="Quitar link de compra"
                onClick={() => dispatch({ type: "remove-purchase-link", id: link.id })}
              >
                <IconX size={16} stroke={1.75} /> Quitar
              </button>
            </li>
          ))}
        </ul>
      )}
      <button type="button" className="btn-secondary" onClick={() => dispatch({ type: "add-purchase-link" })}>
        <IconPlus size={16} stroke={2} /> Añadir link de compra
      </button>
    </div>
  );
}

export function IngredientCreator({
  existingEntry,
  trigger,
  open: controlledOpen,
  onOpenChange: setControlledOpen,
}: {
  /** Si se da, el diálogo edita este ingrediente en vez de crear uno nuevo. */
  existingEntry?: IngredientCatalogEntry;
  /** Trigger propio (ej. un item de un dropdown menu); si se omite, usa el botón por defecto. */
  trigger?: React.ReactNode;
  /** Apertura controlada desde fuera (ej. un dropdown menu); si se omite, el diálogo gestiona su propio estado. */
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}) {
  const isEditing = existingEntry != null;

  const [internalOpen, setInternalOpen] = useState(false);
  const isControlled = controlledOpen !== undefined;
  const open = isControlled ? controlledOpen : internalOpen;
  const setOpen = isControlled ? setControlledOpen! : setInternalOpen;
  const [submitting, setSubmitting] = useState(false);
  const [state, dispatch] = useReducer(creatorReducer, existingEntry, initialCreatorState);

  const canSubmit = !submitting && state.name.trim() !== "";

  function reset() {
    dispatch({ type: "reset", state: initialCreatorState(undefined) });
  }

  async function submitIngredient() {
    setSubmitting(true);
    dispatch({ type: "submit-start" });
    const input = {
      name: state.name.trim(),
      baseUnit: state.baseUnit,
      storageType: state.storageType,
      recommendedTime: state.recommendedTime,
      description: state.description.trim() || undefined,
      pantryShelfLifeDays: parseOptionalNumber(state.pantryShelfLifeDays),
      fridgeShelfLifeDays: parseOptionalNumber(state.fridgeShelfLifeDays),
      freezerShelfLifeDays: parseOptionalNumber(state.freezerShelfLifeDays),
      priceEurPer100: parseOptionalNumber(state.priceEurPer100),
      maxQuantityPerDish: parseOptionalNumber(state.maxQuantityPerDish),
      nutrients: Object.fromEntries(
        NUTRIENT_COLUMNS.map((column) => [column, parseOptionalNumber(state.nutrients[column])]).filter(
          ([, value]) => value !== undefined,
        ),
      ) as Partial<Record<NutrientColumn, number>>,
      purchaseLinks: state.purchaseLinks.map((l) => ({ supermarket: l.supermarket, url: l.url.trim() })),
    };
    try {
      const result = isEditing
        ? await updateIngredientAction(existingEntry.ingredient.id, input)
        : await createIngredientAction(input);
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
    void submitIngredient();
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
            <button
              type="button"
              className="dish-edit-btn"
              aria-label={`Editar ${existingEntry.ingredient.name}`}
            >
              <IconPencil size={16} stroke={1.75} />
            </button>
          ) : (
            <button type="button" className="btn-primary dish-creator-trigger">
              <IconPlus size={16} stroke={2} /> Nuevo ingrediente
            </button>
          )}
        </Dialog.Trigger>
      ) : null}
      <Dialog.Portal>
        <Dialog.Overlay className="dialog-overlay" />
        <Dialog.Content className="dialog-content dish-creator-content">
          <Dialog.Title className="dialog-title">
            {isEditing ? "Editar ingrediente" : "Nuevo ingrediente"}
          </Dialog.Title>
          <form onSubmit={handleSubmit}>
            <IngredientIdentityFields state={state} dispatch={dispatch} />
            <NutrientFields state={state} dispatch={dispatch} />
            <PurchaseLinksFields purchaseLinks={state.purchaseLinks} dispatch={dispatch} />

            {state.error && <p className="warning">{state.error}</p>}

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
                    : "Crear ingrediente"}
              </button>
            </div>
          </form>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
