"use client";

import * as Popover from "@radix-ui/react-popover";
import { IconChartBar } from "@tabler/icons-react";
import { useMemo, useState } from "react";
import {
  sortByNutrientDisplayOrder,
  type DishComplianceCheck,
  type RequirementStatus,
} from "@meal-pilot/core";
import { ChipButton } from "./Chip";
import { NutritionalThresholds } from "./NutritionalThresholds";

/*
Chip de métricas nutricionales del plato: gris y sin texto si cae dentro de
la ventana de su meal, rojo con el detalle de qué falla si no. El tooltip
(Popover) muestra la misma ventana nutricional que el creador de platos, sin
acciones de inspección/sugerencias (aquí es de solo lectura). Se abre al
click (mobile-first) y también al hover en dispositivos con puntero fino,
para no depender solo del tap en escritorio.
*/

function toStatuses(checks: DishComplianceCheck[]): RequirementStatus[] {
  return sortByNutrientDisplayOrder(
    checks.map((check) => ({
      requirement: check.requirement,
      accumulated: check.value,
      effectiveMinimum: check.effectiveMinimum,
      effectiveMaximum: check.effectiveMaximum,
      withinRange: check.withinWindow,
    })),
  );
}

function isHoverCapable(): boolean {
  return typeof window !== "undefined" && window.matchMedia("(hover: hover) and (pointer: fine)").matches;
}

export function DishComplianceChip({ checks }: { checks: DishComplianceCheck[] }) {
  const [open, setOpen] = useState(false);
  const compliant = checks.every((check) => check.withinWindow);
  const failing = checks.filter((check) => !check.withinWindow);
  const statuses = useMemo(() => toStatuses(checks), [checks]);

  function openOnHover() {
    if (isHoverCapable()) setOpen(true);
  }
  function closeOnHover() {
    if (isHoverCapable()) setOpen(false);
  }

  return (
    <Popover.Root open={open} onOpenChange={setOpen}>
      <Popover.Trigger asChild>
        <ChipButton
          tone={compliant ? "default" : "off"}
          onMouseEnter={openOnHover}
          onMouseLeave={closeOnHover}
        >
          <IconChartBar size={12} stroke={2} />
          {!compliant && (
            <>Fuera de ventana: {failing.map((check) => check.requirement.name).join(", ")}</>
          )}
        </ChipButton>
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content
          className="select-content dish-compliance-popover"
          align="start"
          sideOffset={4}
          collisionPadding={16}
          onMouseEnter={openOnHover}
          onMouseLeave={closeOnHover}
        >
          <NutritionalThresholds statuses={statuses} />
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}
