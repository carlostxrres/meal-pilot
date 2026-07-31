import { IconSettings } from "@tabler/icons-react";

/** Shell inicial — qué configuraciones concretas van aquí queda por decidir. */
export default function SettingsPage() {
  return (
    <div>
      <h2 className="section-title">
        <IconSettings size={14} stroke={2} /> Configuración
      </h2>
      <p className="section-note">Todavía no hay nada que configurar aquí.</p>
    </div>
  );
}
