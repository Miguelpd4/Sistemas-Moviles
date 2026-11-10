/**
 * Formatea un importe en céntimos como euros en español: 1840 → "18,40 €".
 * Se trabaja siempre en céntimos (enteros) para evitar errores de coma flotante en el reparto.
 * No usa Intl para que el resultado sea idéntico en Android (Hermes), web y Jest.
 */
export function formatEuros(cents: number): string {
  if (!Number.isFinite(cents)) {
    throw new RangeError(`Importe no válido: ${cents}`);
  }
  const rounded = Math.round(cents);
  const sign = rounded < 0 ? '-' : '';
  const abs = Math.abs(rounded);
  const euros = Math.floor(abs / 100)
    .toString()
    .replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  const decimals = (abs % 100).toString().padStart(2, '0');
  return `${sign}${euros},${decimals} €`;
}
