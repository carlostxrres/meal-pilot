import type { ReactNode } from "react";
import type { RequirementStatus } from "@meal-pilot/core";
import { CapsuleMeter } from "./CapsuleMeter";

/*
Grid de CapsuleMeter en variante compact, compartido entre el creador de
platos (con acciones de inspección/sugerencias por fila) y el tooltip del
chip de cumplimiento en el card de plato (de solo lectura, sin acciones).
*/

export function NutritionalThresholds({
  statuses,
  emptyMessage = "Este plato no tiene requisitos nutricionales definidos.",
  renderActions,
}: {
  statuses: RequirementStatus[];
  emptyMessage?: string;
  renderActions?: (status: RequirementStatus) => ReactNode;
}) {
  if (statuses.length === 0) {
    return <p className="section-note">{emptyMessage}</p>;
  }

  return (
    <div className="capsule-meter-grid">
      {statuses.map((status) => (
        <CapsuleMeter
          key={status.requirement.id}
          status={status}
          compact
          actions={renderActions?.(status)}
        />
      ))}
    </div>
  );
}
