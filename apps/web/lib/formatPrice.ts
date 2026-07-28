/** "2,30 €" — precio aproximado en euros, formato español. */
export function formatEur(value: number): string {
  return `${value.toLocaleString("es-ES", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €`;
}
