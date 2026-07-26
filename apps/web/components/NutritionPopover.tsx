"use client";

import * as Popover from "@radix-ui/react-popover";
import { IconInfoCircle } from "@tabler/icons-react";
import type { NutritionTotals } from "@meal-pilot/core";

const ROWS: { key: keyof NutritionTotals; label: string; unit: string }[] = [
  { key: "kcal_per_100", label: "Kcal", unit: "" },
  { key: "protein_g_per_100", label: "Proteína", unit: "g" },
  { key: "carbs_g_per_100", label: "Hidratos", unit: "g" },
  { key: "fat_g_per_100", label: "Grasa", unit: "g" },
  { key: "fiber_g_per_100", label: "Fibra", unit: "g" },
];

export function NutritionPopover({ totals }: { totals: NutritionTotals }) {
  return (
    <Popover.Root>
      <Popover.Trigger asChild>
        <button type="button" className="nutrition-trigger" aria-label="Ver valores nutricionales">
          <IconInfoCircle size={18} stroke={1.75} />
        </button>
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content className="nutrition-popover" sideOffset={6} align="end">
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
