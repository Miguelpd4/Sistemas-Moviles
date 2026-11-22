/**
 * Muro de recuerdos (#34): las fotos de un viaje se ven durante el viaje y hasta 7 días después
 * de que termine; luego se borran solas (Edge Function purge-memories). Igual que la función
 * `memories_open` de la base de datos.
 */
export const MEMORY_DAYS = 7;
const DAY_MS = 24 * 3600 * 1000;

/** Cuándo se borran las fotos de un viaje, o null si aún no ha terminado. */
export function memoriesExpireAt(endedAt: string | null): number | null {
  return endedAt === null ? null : new Date(endedAt).getTime() + MEMORY_DAYS * DAY_MS;
}

/** ¿Se pueden ver y subir fotos de este viaje? */
export function memoriesOpen(endedAt: string | null, now: number): boolean {
  const expires = memoriesExpireAt(endedAt);
  return expires === null || now < expires;
}

/** «Se borran en 5 días», «Se borran en 9 h» o, durante el viaje, cuándo se borrarán. */
export function expiryLabel(endedAt: string | null, now: number): string {
  const expires = memoriesExpireAt(endedAt);
  if (expires === null) return `Se borran ${MEMORY_DAYS} días después de terminar el viaje`;
  const left = expires - now;
  if (left <= 0) return 'Ya se han borrado';
  const hours = Math.ceil(left / 3600_000);
  if (hours <= 24) return `Se borran en ${hours} h`;
  return `Se borran en ${Math.ceil(left / DAY_MS)} días`;
}
