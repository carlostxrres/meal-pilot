"use client";

import { IconSearch, IconX } from "@tabler/icons-react";

export function SearchField({
  value,
  onChange,
  placeholder,
  id,
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  id?: string;
}) {
  return (
    <div className="search-field">
      <IconSearch size={16} stroke={1.75} />
      <input
        id={id}
        type="text"
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
      {value !== "" && (
        <button
          type="button"
          className="search-field-clear"
          aria-label="Borrar búsqueda"
          onClick={() => onChange("")}
        >
          <IconX size={16} stroke={2} />
        </button>
      )}
    </div>
  );
}
