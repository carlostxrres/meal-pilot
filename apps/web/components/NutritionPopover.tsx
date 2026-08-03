"use client";

import * as Popover from "@radix-ui/react-popover";
import { IconInfoCircle } from "@tabler/icons-react";
import {
  NUTRIENT_COLUMNS,
  sortColumnsByDisplayOrder,
  type NutrientColumn,
  type NutritionTotals,
} from "@meal-pilot/core";

/** Mismo orden que .capsule-meter-grid (sortColumnsByDisplayOrder, ver nutrientOrder.ts) — solo cambian las etiquetas, pensadas para un ingrediente suelto en vez de una ventana por meal. */
const NUTRIENT_LABELS: Record<NutrientColumn, { label: string; unit: string }> = {
  kcal_per_100: { label: "Kcal", unit: "" },
  fat_g_per_100: { label: "Grasas", unit: "g" },
  saturated_fat_g_per_100: { label: "de las cuales saturadas", unit: "g" },
  carbs_g_per_100: { label: "Hidratos", unit: "g" },
  sugar_g_per_100: { label: "de los cuales azúcares", unit: "g" },
  fiber_g_per_100: { label: "Fibra", unit: "g" },
  protein_g_per_100: { label: "Proteína", unit: "g" },
  sodium_mg_per_100: { label: "Sodio", unit: "mg" },
  vitamin_c_mg_per_100: { label: "Vitamina C", unit: "mg" },
  iron_mg_per_100: { label: "Hierro", unit: "mg" },
  calcium_mg_per_100: { label: "Calcio", unit: "mg" },
  omega3_g_per_100: { label: "Omega 3", unit: "g" },
};

const ROWS = sortColumnsByDisplayOrder(NUTRIENT_COLUMNS, (column) => column).map((key) => ({
  key,
  ...NUTRIENT_LABELS[key],
}));

export function NutritionPopover({
  totals,
  title,
}: {
  totals: NutritionTotals;
  /** Encabezado opcional del popover, ej. "Por 100g" para un ingrediente suelto. */
  title?: string;
}) {
  return (
    <Popover.Root>
      <Popover.Trigger asChild>
        <button
          type="button"
          className="nutrition-trigger"
          aria-label={title ? `Ver valores nutricionales (${title})` : "Ver valores nutricionales"}
        >
          <IconInfoCircle size={18} stroke={1.75} />
        </button>
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content className="nutrition-popover" sideOffset={6} align="end">
          {title && <p className="nutrition-popover-title">{title}</p>}
          <ul className="nutrition-list">
            {ROWS.map(({ key, label, unit }) => (
              <li key={key}>
                <span>{label}</span>
                <span className="data-mono">
                  {totals[key].toFixed(1)}
                  {unit}
                </span>
              </li>
            ))}
          </ul>
          <Popover.Arrow className="nutrition-arrow" />
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}
