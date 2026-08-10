"use client";

import * as Popover from "@radix-ui/react-popover";
import type { ReactNode } from "react";
import { ChipButton } from "@/components/Chip";
import styles from "@/components/InfoChip.module.css";

/*
Chip clicable que abre un popover con una frase explicativa — mismo patrón
que NutritionPopover (Popover.Trigger asChild sobre un chip) pero para una
única línea de texto con icono opcional, en vez de la tabla de nutrientes.
stopPropagation en el trigger: igual que NutritionPopover, si la fila entera
es clicable (ej. resultado de búsqueda) abrir el popover no debe además
disparar la acción de la fila.
*/
export function InfoChip({
  label,
  icon,
  description,
}: {
  label: ReactNode;
  /** Icono según el valor concreto (ej. storage_type/animal_origin) — opcional, el chip de precio no lleva. */
  icon?: ReactNode;
  description: string;
}) {
  return (
    <Popover.Root>
      <Popover.Trigger asChild>
        <ChipButton onClick={(e) => e.stopPropagation()}>{label}</ChipButton>
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content className={styles['info-popover']} sideOffset={6} align="start">
          <p className={styles['info-popover-text']}>
            {icon && <span className={styles['info-popover-icon']}>{icon}</span>}
            {description}
          </p>
          <Popover.Arrow className={styles['info-popover-arrow']} />
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}
