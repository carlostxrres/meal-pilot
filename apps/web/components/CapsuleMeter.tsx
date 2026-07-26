import type { RequirementStatus } from "@comida-diaria/core";

/*
Intent: vistazo rápido y de baja atención al estado de un requisito
dietético — no es un dashboard analítico, es "¿voy bien o no, y por qué
margen?". Palette: --success/--off (semántico, ver system.md) sobre
--hairline-soft (superficie neutra). Depth: sin sombra, solo track plano.
Signature: la banda de tolerancia (effectiveMinimum..effectiveMaximum) se
ve como zona, no como un simple % — es el dato real de tolerance_margin.
*/
export function CapsuleMeter({ status }: { status: RequirementStatus }) {
  const { requirement, accumulated, effectiveMinimum, effectiveMaximum, withinRange } = status;

  const scaleMax = Math.max(effectiveMaximum ?? 0, effectiveMinimum ?? 0, accumulated, 1) * 1.15;
  const pct = (v: number) => Math.min((v / scaleMax) * 100, 100);

  const bandStart = effectiveMinimum != null ? pct(effectiveMinimum) : 0;
  const bandEnd = effectiveMaximum != null ? pct(effectiveMaximum) : 100;
  const fillWidth = pct(accumulated);

  return (
    <div className="capsule-meter" role="meter" aria-valuenow={accumulated} aria-valuemin={0} aria-valuemax={scaleMax}>
      <div className="capsule-meter-label">
        <span className="capsule-meter-desc">{requirement.description ?? requirement.id}</span>
        <span className="capsule-meter-value">
          {accumulated.toFixed(1)} {requirement.unit}
        </span>
      </div>
      <div className="capsule-meter-track">
        <div
          className="capsule-meter-band"
          style={{ left: `${bandStart}%`, width: `${Math.max(bandEnd - bandStart, 0)}%` }}
        />
        <div
          className="capsule-meter-fill"
          data-off={!withinRange}
          style={{ width: `${fillWidth}%` }}
        />
      </div>
    </div>
  );
}
