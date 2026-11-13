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

/** Metros como kilómetros con un decimal: 12345 → "12,3 km"; menos de 1 km en metros: 950 → "950 m". */
export function formatKm(meters: number): string {
  if (!Number.isFinite(meters) || meters < 0) return '0 m';
  if (meters < 1000) return `${Math.round(meters)} m`;
  return `${(Math.round(meters / 100) / 10).toFixed(1).replace('.', ',')} km`;
}

/** Segundos como duración legible: 59 → "59 s", 480 → "8 min", 3900 → "1 h 05 min". */
export function formatDuration(seconds: number): string {
  const total = Math.max(0, Math.round(seconds));
  if (total < 60) return `${total} s`;
  const minutes = Math.floor(total / 60);
  if (minutes < 60) return `${minutes} min`;
  return `${Math.floor(minutes / 60)} h ${String(minutes % 60).padStart(2, '0')} min`;
}
