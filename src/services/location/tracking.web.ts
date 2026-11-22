import { haversineM, type GeoPoint } from '@/lib/distance';
import { AppError } from '@/lib/errors';

import { flushTrip } from './tripFlush';
import { appendPoints, getActiveTrip, type StoredPoint } from './tripStorage';

export { flushTrip };

/**
 * GPS del viaje en la web (#29): el navegador da la ubicación mientras la página está abierta.
 * Los puntos se guardan y se suben igual que en Android (tripFlush.ts). A diferencia de la app,
 * con la pantalla apagada o la pestaña en segundo plano el navegador deja de dar la ubicación.
 */
export const GPS_TASK = 'copi-gps';

let watchId: number | null = null;
let lastFix: StoredPoint | null = null;

const geo = (): Geolocation | null => (typeof navigator !== 'undefined' && navigator.geolocation ? navigator.geolocation : null);

function deniedError(): AppError {
  return new AppError(
    'Sin permiso de ubicación no se puede medir el viaje. Permítela en el navegador (el candado junto a la dirección) y vuelve a intentarlo.',
    { code: 'LOCATION_DENIED_WEB' },
  );
}

function getPosition(timeoutMs: number): Promise<GeolocationPosition> {
  return new Promise((resolve, reject) => {
    const g = geo();
    if (!g) {
      reject(new AppError('Este navegador no puede darnos tu ubicación.', { code: 'LOCATION_UNAVAILABLE' }));
      return;
    }
    g.getCurrentPosition(resolve, (error) =>
      reject(
        error.code === error.PERMISSION_DENIED
          ? deniedError()
          : new AppError('No se ha podido saber dónde estás. Comprueba que la ubicación del móvil está encendida.', {
              code: 'LOCATION_OFF',
            }),
      ),
    { enableHighAccuracy: true, maximumAge: 30_000, timeout: timeoutMs });
  });
}

/** Punto a guardar. Si el navegador no da la velocidad, se calcula con el punto anterior. */
function toPoint(position: GeolocationPosition, previous: StoredPoint | null): StoredPoint {
  const point = {
    lat: position.coords.latitude,
    lon: position.coords.longitude,
    accuracy: position.coords.accuracy,
    timestamp: position.timestamp,
  };
  let speed = position.coords.speed;
  if (speed === null && previous) {
    const seconds = (point.timestamp - previous.timestamp) / 1000;
    speed = seconds > 0 ? haversineM(previous, point) / seconds : null;
  }
  return { ...point, speed };
}

async function onPosition(position: GeolocationPosition): Promise<void> {
  const point = toPoint(position, lastFix);
  lastFix = point;
  try {
    const sessionId = await getActiveTrip();
    if (sessionId === null) return;
    await appendPoints(sessionId, [point]);
    await flushTrip(sessionId).catch(() => undefined);
  } catch {
    // Si falla el guardado se pierde este punto; el siguiente lo intentará de nuevo.
  }
}

export async function loadPoints(): Promise<GeoPoint[]> {
  return [];
}
export async function clearPoints(): Promise<void> {
  // La pantalla de pruebas del GPS solo existe en Android.
}

export async function isTracking(): Promise<boolean> {
  return watchId !== null;
}

/** En la web basta con el permiso del navegador (lo pide la primera vez). */
export async function requestTrackingPermissions(): Promise<void> {
  await getPosition(20_000);
}

export async function currentPosition(): Promise<{ lat: number; lon: number } | null> {
  try {
    const position = await getPosition(10_000);
    return { lat: position.coords.latitude, lon: position.coords.longitude };
  } catch {
    return null;
  }
}

export async function startTracking(): Promise<void> {
  const g = geo();
  if (!g) throw new AppError('Este navegador no puede darnos tu ubicación.', { code: 'LOCATION_UNAVAILABLE' });
  if (watchId !== null) return;
  watchId = g.watchPosition(
    (position) => void onPosition(position),
    () => undefined, // Un fallo suelto (sin cobertura un momento) no para el viaje.
    { enableHighAccuracy: true, maximumAge: 5000 },
  );
}

export async function stopTracking(): Promise<void> {
  const g = geo();
  if (g && watchId !== null) g.clearWatch(watchId);
  watchId = null;
  lastFix = null;
}

export function openLocationSettings(): void {
  // Sin ajustes del sistema en la web: el permiso se cambia en el navegador.
}
