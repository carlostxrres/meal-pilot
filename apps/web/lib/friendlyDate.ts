const DAY_MS = 24 * 60 * 60 * 1000;

function daysBetween(dateStr: string, referenceStr: string): number {
  const date = Date.parse(`${dateStr}T00:00:00Z`);
  const reference = Date.parse(`${referenceStr}T00:00:00Z`);
  return Math.round((date - reference) / DAY_MS);
}

/** "Hoy" / "Mañana" / "Pasado mañana" para los próximos 2 días, si no "1 de agosto". */
export function formatFriendlyDate(dateStr: string, referenceStr: string): string {
  switch (daysBetween(dateStr, referenceStr)) {
    case 0:
      return "Hoy";
    case 1:
      return "Mañana";
    case 2:
      return "Pasado mañana";
    default:
      return new Intl.DateTimeFormat("es-ES", { day: "numeric", month: "long", timeZone: "UTC" }).format(
        new Date(`${dateStr}T00:00:00Z`),
      );
  }
}
