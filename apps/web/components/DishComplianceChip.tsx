"use client";

import * as Popover from "@radix-ui/react-popover";
import { IconChartBar, IconEye } from "@tabler/icons-react";
import { useMemo, useState } from "react";
import {
  sortByNutrientDisplayOrder,
  type DishComplianceCheck,
  type RequirementStatus,
  type ResolvedComponent,
} from "@meal-pilot/core";
import { ChipButton } from "./Chip";
import { ContributionDialog } from "./ContributionDialog";
import { NutritionalThresholds } from "./NutritionalThresholds";

/*
Chip de métricas nutricionales del plato: gris y sin texto si cae dentro de
la ventana de su meal, rojo con el detalle de qué falla si no. El tooltip
(Popover) muestra la misma ventana nutricional que el creador de platos, con
la misma acción de inspección de contribuciones por nutriente (el ojo, ver
.meter-action) pero sin sugerencias (aquí es de solo lectura: el plato ya
está guardado, no se puede corregir desde este chip). Se abre al click
(mobile-first) y también al hover en dispositivos con puntero fino, para no
depender solo del tap en escritorio.
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

export function DishComplianceChip({
  checks,
  components,
}: {
  checks: DishComplianceCheck[];
  /** Componentes fijos de la dish, para la inspección de contribuciones por nutriente. */
  components: ResolvedComponent[];
}) {
  const [open, setOpen] = useState(false);
  const [inspectingId, setInspectingId] = useState<string | null>(null);
  const compliant = checks.every((check) => check.withinWindow);
  const failing = checks.filter((check) => !check.withinWindow);
  const statuses = useMemo(() => toStatuses(checks), [checks]);
  const inspecting = statuses.find((s) => s.requirement.id === inspectingId) ?? null;

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
          <NutritionalThresholds
            statuses={statuses}
            renderActions={(status) => (
              <span className="meter-actions">
                <button
                  type="button"
                  className="meter-action"
                  aria-label={`Ver contribuciones de ${status.requirement.name}`}
                  onClick={() => setInspectingId(status.requirement.id)}
                >
                  <IconEye size={16} stroke={1.75} />
                </button>
              </span>
            )}
          />
        </Popover.Content>
      </Popover.Portal>
      <ContributionDialog
        status={inspecting}
        components={components}
        onOpenChange={(o) => !o && setInspectingId(null)}
      />
    </Popover.Root>
  );
}
