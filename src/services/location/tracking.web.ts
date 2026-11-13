import type { GeoPoint } from '@/lib/distance';
import { AppError } from '@/lib/errors';

/** En la web no se mide el viaje: lo hace el móvil Android del conductor. */
export const GPS_TASK = 'copi-gps';

export async function loadPoints(): Promise<GeoPoint[]> {
  return [];
}
export async function clearPoints(): Promise<void> {
  // Nada que borrar en la web.
}
export async function isTracking(): Promise<boolean> {
  return false;
}
export async function startTracking(): Promise<void> {
  throw new AppError('El GPS del viaje solo funciona en la app de Android.');
}
export async function stopTracking(): Promise<void> {
  // Nada que parar en la web.
}
export function openLocationSettings(): void {
  // Sin ajustes del sistema en la web.
}
