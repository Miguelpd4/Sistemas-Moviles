import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Location from 'expo-location';
import * as TaskManager from 'expo-task-manager';
import { Linking } from 'react-native';

import type { GeoPoint } from '@/lib/distance';
import { AppError } from '@/lib/errors';
import { driverColors } from '@/theme/tokens';

import { flushTrip } from './tripFlush';
import { appendPoints, getActiveTrip, type StoredPoint } from './tripStorage';

export { flushTrip };

/**
 * GPS del viaje en segundo plano (S2-08). La tarea se define al cargar este módulo, por eso se
 * importa desde app/_layout.tsx: Android la necesita registrada al arrancar.
 *
 * Con un viaje activo, cada punto se guarda en el móvil y se sube a trip_points en lotes (10
 * puntos o 15 segundos); después se recalcula la distancia y se actualiza trip_metrics, que los
 * pasajeros ven en vivo. Sin viaje activo (pantalla de pruebas), los puntos solo se guardan.
 */
export const GPS_TASK = 'copi-gps';
const DEV_KEY = 'copi:dev-gps:puntos';

type TaskData = { locations?: Location.LocationObject[] };

TaskManager.defineTask<TaskData>(GPS_TASK, async ({ data, error }) => {
  if (error || !data?.locations?.length) return;
  const incoming: StoredPoint[] = data.locations.map((location) => ({
    lat: location.coords.latitude,
    lon: location.coords.longitude,
    accuracy: location.coords.accuracy,
    speed: location.coords.speed,
    timestamp: location.timestamp,
  }));
  try {
    const sessionId = await getActiveTrip();
    if (sessionId === null) {
      const stored = await loadPoints();
      await AsyncStorage.setItem(DEV_KEY, JSON.stringify([...stored, ...incoming]));
      return;
    }
    await appendPoints(sessionId, incoming);
    await flushTrip(sessionId).catch(() => undefined);
  } catch {
    // Si falla el guardado se pierde este lote; el siguiente lo intentará de nuevo.
  }
});

/** Puntos de la pantalla de pruebas del GPS. */
export async function loadPoints(): Promise<GeoPoint[]> {
  const raw = await AsyncStorage.getItem(DEV_KEY);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as GeoPoint[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export async function clearPoints(): Promise<void> {
  await AsyncStorage.removeItem(DEV_KEY);
}

export async function isTracking(): Promise<boolean> {
  try {
    return await Location.hasStartedLocationUpdatesAsync(GPS_TASK);
  } catch {
    return false;
  }
}

/** Pide los permisos: primero en primer plano y después «todo el tiempo». */
export async function requestTrackingPermissions(): Promise<void> {
  const foreground = await Location.requestForegroundPermissionsAsync();
  if (!foreground.granted) {
    throw new AppError('Sin permiso de ubicación no se puede medir el viaje. Actívalo en los ajustes.', {
      code: 'LOCATION_DENIED',
    });
  }
  const background = await Location.requestBackgroundPermissionsAsync();
  if (!background.granted) {
    throw new AppError(
      'Para medir el viaje con la pantalla apagada, elige «Permitir todo el tiempo» en los permisos de ubicación de Copi.',
      { code: 'BACKGROUND_DENIED' },
    );
  }
}

/** Posición actual (para el precio del combustible y el punto de salida). */
export async function currentPosition(): Promise<{ lat: number; lon: number } | null> {
  try {
    const last = await Location.getLastKnownPositionAsync({ maxAge: 60_000 });
    const position = last ?? (await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced }));
    return { lat: position.coords.latitude, lon: position.coords.longitude };
  } catch {
    return null;
  }
}

/** Arranca la tarea en segundo plano (pide los permisos si hace falta). */
export async function startTracking(): Promise<void> {
  await requestTrackingPermissions();
  if (await isTracking()) return;
  await Location.startLocationUpdatesAsync(GPS_TASK, {
    accuracy: Location.Accuracy.High,
    timeInterval: 5000,
    distanceInterval: 15,
    pausesUpdatesAutomatically: false,
    foregroundService: {
      notificationTitle: 'Copi está midiendo el viaje',
      notificationBody: 'Toca para volver a Copi',
      notificationColor: driverColors.accent,
    },
  });
}

export async function stopTracking(): Promise<void> {
  if (await isTracking()) await Location.stopLocationUpdatesAsync(GPS_TASK);
}

export function openLocationSettings(): void {
  void Linking.openSettings();
}
