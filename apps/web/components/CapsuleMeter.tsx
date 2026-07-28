import * as Progress from "@radix-ui/react-progress";
import type { ReactNode } from "react";
import type { DietaryRequirement, RequirementStatus } from "@meal-pilot/core";

/*
Intent: vistazo rápido y de baja atención al estado de un requisito
dietético — no es un dashboard analítico, es "¿voy bien o no, y por qué
margen?". Palette: --success/--off (semántico, ver system.md) sobre
--hairline-soft (superficie neutra). Depth: sin sombra, solo track plano.
Signature: la banda de tolerancia (effectiveMinimum..effectiveMaximum) se
ve como zona, no como un simple % — es el dato real de tolerance_margin.
Base: Radix Progress (accesibilidad/semántica), banda + relleno son overlays
propios encima del Indicator.

Variante `compact`: una sola línea (nombre · track · valor · acciones), para
contextos donde el espacio vertical importa (ej. el creador de dishes, donde
el usuario edita ingredientes mientras mira los medidores en vivo).
*/

/** "35", "70–115", "> 25" o "< 7" (el objetivo tal cual se definió, no el margen de tolerancia). */
function formatTarget(requirement: DietaryRequirement): string | null {
  const { minimum, maximum } = requirement;
  if (minimum != null && maximum != null) return `${minimum}–${maximum}`;
  if (minimum != null) return `> ${minimum}`;
  if (maximum != null) return `< ${maximum}`;
  return null;
}

function MeterTrack({ status }: { status: RequirementStatus }) {
  const { accumulated, effectiveMinimum, effectiveMaximum, withinRange } = status;
  const scaleMax = Math.max(effectiveMaximum ?? 0, effectiveMinimum ?? 0, accumulated, 1) * 1.15;
  const pct = (v: number) => Math.min((v / scaleMax) * 100, 100);
  const bandStart = effectiveMinimum != null ? pct(effectiveMinimum) : 0;
  const bandEnd = effectiveMaximum != null ? pct(effectiveMaximum) : 100;
  const fillPct = pct(accumulated);

  return (
    <Progress.Root className="capsule-meter-track" value={accumulated} max={scaleMax}>
      <div
        className="capsule-meter-band"
        style={{ left: `${bandStart}%`, width: `${Math.max(bandEnd - bandStart, 0)}%` }}
      />
      <Progress.Indicator
        className="capsule-meter-fill"
        data-off={!withinRange}
        style={{ transform: `translateX(-${100 - fillPct}%)` }}
      />
    </Progress.Root>
  );
}

export function CapsuleMeter({
  status,
  compact = false,
  actions,
}: {
  status: RequirementStatus;
  compact?: boolean;
  /** Solo en compact: botones al final de la línea (ej. inspección/sugerencias). */
  actions?: ReactNode;
}) {
  const { requirement, accumulated } = status;
  const target = formatTarget(requirement);

  if (compact) {
    return (
      <div className="capsule-meter-compact">
        <span className="capsule-meter-name">{requirement.name}</span>
        <MeterTrack status={status} />
        <span className="capsule-meter-value">
          {accumulated.toFixed(1)}
          {target && ` / ${target}`} {requirement.unit}
        </span>
        {actions}
      </div>
    );
  }

  return (
    <div className="capsule-meter">
      <div className="capsule-meter-label">
        <span className="capsule-meter-name">{requirement.name}</span>
        <span className="capsule-meter-value">
          {accumulated.toFixed(1)} {requirement.unit}
          {target && ` / ${target} ${requirement.unit}`}
        </span>
      </div>
      <MeterTrack status={status} />
      {requirement.description && <p className="capsule-meter-detail">{requirement.description}</p>}
    </div>
  );
}
