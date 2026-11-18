/** Reglas del viaje (S2-08). */

export type LastPoint = { speedMps: number | null; timestamp: number } | null;

/** Por debajo de esto (unos 5 km/h) el coche se considera parado. */
export const STOPPED_SPEED_MPS = 1.5;
/** Sin puntos durante este tiempo, el coche se considera parado (el GPS no manda si no se mueve). */
export const NO_POINTS_MS = 20_000;

/** ¿Se puede finalizar el viaje? Solo con el coche parado. */
export function canFinish(lastPoint: LastPoint, now: number): boolean {
  if (lastPoint === null) return true;
  if (now - lastPoint.timestamp >= NO_POINTS_MS) return true;
  return lastPoint.speedMps !== null && lastPoint.speedMps < STOPPED_SPEED_MPS;
}

/** Velocidad media en km/h con una cifra, o null si aún no tiene sentido. */
export function averageSpeedKmh(distanceM: number, seconds: number): number | null {
  if (seconds < 60 || distanceM <= 0) return null;
  return Math.round((distanceM / seconds) * 3.6);
}

/** Clave de la caché de precios: combustible y zona de 1 decimal (unos 11 km). */
export function fuelCacheKey(fuel: string, lat: number, lon: number): string {
  return `${fuel}:${lat.toFixed(1)},${lon.toFixed(1)}`;
}

/** "1,559" o "1.559" → 1.559. null si no es un precio razonable (entre 0 y 5 €/L). */
export function parseFuelPrice(raw: string): number | null {
  const text = raw.trim().replace(',', '.');
  if (!/^\d+(\.\d+)?$/.test(text)) return null;
  const value = Math.round(Number(text) * 1000) / 1000;
  return value > 0 && value <= 5 ? value : null;
}

/** 1.559 → "1,559". */
export function formatFuelPrice(value: number): string {
  return value.toFixed(3).replace('.', ',');
}

