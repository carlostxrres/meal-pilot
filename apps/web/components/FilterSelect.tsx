"use client";

import * as Select from "@radix-ui/react-select";
import { IconCheck, IconChevronDown } from "@tabler/icons-react";

/** Un <Select> de Radix genérico (mismo look en toda la app: orden, filtros de Platos, filtros de Ingredientes...) — evita repetir el boilerplate de Radix en cada sitio que necesite un desplegable de opciones. */
export function FilterSelect<T extends string>({
  value,
  onChange,
  options,
  ariaLabel,
}: {
  value: T;
  onChange: (value: T) => void;
  options: readonly (readonly [T, string])[];
  ariaLabel: string;
}) {
  return (
    <Select.Root value={value} onValueChange={(v) => onChange(v as T)}>
      <Select.Trigger className="select-trigger" aria-label={ariaLabel}>
        <Select.Value />
        <Select.Icon>
          <IconChevronDown size={16} stroke={2} />
        </Select.Icon>
      </Select.Trigger>
      <Select.Portal>
        <Select.Content className="select-content" position="popper" sideOffset={4}>
          <Select.Viewport>
            {options.map(([optionValue, label]) => (
              <Select.Item key={optionValue} value={optionValue} className="select-item select-item-with-check">
                <Select.ItemIndicator className="select-item-indicator">
                  <IconCheck size={16} stroke={2} />
                </Select.ItemIndicator>
                <Select.ItemText>{label}</Select.ItemText>
              </Select.Item>
            ))}
          </Select.Viewport>
        </Select.Content>
      </Select.Portal>
    </Select.Root>
  );
}
