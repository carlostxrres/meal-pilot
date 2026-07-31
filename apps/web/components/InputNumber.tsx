"use client";

import { IconMinus, IconPlus } from "@tabler/icons-react";

/*
Stepper numérico compartido (sustituye a la pareja suelta de botones +/- e
input crudo que había en el creador de platos): un único contenedor con
borde, botón menos a la izquierda, campo centrado y botón más a la derecha,
sin bordes propios entre ellos — igual que la mayoría de "number field" de
referencia. El sufijo de unidad (g, ml, €...) no vive aquí: cada sitio que
lo necesite lo añade al lado, como ya hacía antes.
*/

export function InputNumber({
  id,
  value,
  onChange,
  step = 1,
  min,
  max,
  ariaLabel,
  disabled,
}: {
  id?: string;
  value: number;
  onChange: (value: number) => void;
  step?: number;
  min?: number;
  max?: number;
  /** Nombre del campo para los aria-label de los botones (ej. el nombre del ingrediente). */
  ariaLabel?: string;
  disabled?: boolean;
}) {
  function clamp(next: number): number {
    let result = next;
    if (min != null) result = Math.max(min, result);
    if (max != null) result = Math.min(max, result);
    return result;
  }

  const decrementLabel = ariaLabel ? `Restar ${step} a ${ariaLabel}` : `Restar ${step}`;
  const incrementLabel = ariaLabel ? `Sumar ${step} a ${ariaLabel}` : `Sumar ${step}`;

  return (
    <div className="input-number" data-disabled={disabled || undefined}>
      <button
        type="button"
        className="input-number-btn"
        aria-label={decrementLabel}
        onClick={() => onChange(clamp(value - step))}
        disabled={disabled || (min != null && value <= min)}
      >
        <IconMinus size={13} stroke={2} />
      </button>
      <input
        id={id}
        type="number"
        className="input-number-field"
        step="any"
        min={min}
        max={max}
        value={value}
        disabled={disabled}
        onChange={(event) => {
          // valueAsNumber es NaN con el campo vacío o a medio teclear; se
          // guarda 0 en vez de propagar NaN al estado del llamante.
          const parsed = event.target.valueAsNumber;
          onChange(Number.isFinite(parsed) ? parsed : 0);
        }}
        aria-label={ariaLabel ? `Cantidad de ${ariaLabel}` : "Cantidad"}
      />
      <button
        type="button"
        className="input-number-btn"
        aria-label={incrementLabel}
        onClick={() => onChange(clamp(value + step))}
        disabled={disabled || (max != null && value >= max)}
      >
        <IconPlus size={13} stroke={2} />
      </button>
    </div>
  );
}
