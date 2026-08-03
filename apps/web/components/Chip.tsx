"use client";

import { forwardRef, type ButtonHTMLAttributes, type HTMLAttributes } from "react";

/*
Etiqueta compacta compartida (.chip): el mealName informativo del catálogo de
platos y el chip de cumplimiento nutricional (interactivo, con popover) son
la misma pieza visual con distinto tono y distinto elemento HTML —
`Chip` para las de solo lectura (span), `ChipButton` cuando hace falta un
trigger clicable (ej. Popover.Trigger asChild).
*/

function chipClassName(className: string | undefined, extra?: string): string {
  return ["chip", extra, className].filter(Boolean).join(" ");
}

export type ChipTone = "default" | "off";

interface ChipOwnProps {
  tone?: ChipTone;
}

export const Chip = forwardRef<HTMLSpanElement, ChipOwnProps & HTMLAttributes<HTMLSpanElement>>(
  function Chip({ tone = "default", className, ...props }, ref) {
    return (
      <span
        ref={ref}
        className={chipClassName(className)}
        data-tone={tone === "off" ? "off" : undefined}
        {...props}
      />
    );
  },
);

export const ChipButton = forwardRef<
  HTMLButtonElement,
  ChipOwnProps & ButtonHTMLAttributes<HTMLButtonElement>
>(function ChipButton({ tone = "default", className, type = "button", ...props }, ref) {
  return (
    <button
      ref={ref}
      type={type}
      className={chipClassName(className, "chip-button")}
      data-tone={tone === "off" ? "off" : undefined}
      {...props}
    />
  );
});
