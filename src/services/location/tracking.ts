import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Location from 'expo-location';
import * as TaskManager from 'expo-task-manager';
import { Linking } from 'react-native';

import type { GeoPoint } from '@/lib/distance';
import { AppError } from '@/lib/errors';

/**
 * Prueba técnica del GPS en segundo plano (S1-10). La tarea se define al cargar este módulo,
 * por eso se importa desde app/_layout.tsx: Android la necesita registrada al arrancar.
 * En el Sprint 2 los puntos se suben a trip_points.
 */
export const GPS_TASK = 'copi-gps';
const STORAGE_KEY = 'copi:dev-gps:puntos';

type TaskData = { locations?: Location.LocationObject[] };

TaskManager.defineTask<TaskData>(GPS_TASK, async ({ data, error }) => {
  if (error || !data?.locations?.length) return;
  const incoming: GeoPoint[] = data.locations.map((location) => ({
    lat: location.coords.latitude,
    lon: location.coords.longitude,
    accuracy: location.coords.accuracy,
    timestamp: location.timestamp,
  }));
  try {
    const stored = await loadPoints();
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify([...stored, ...incoming]));
  } catch {
    // Si falla el guardado se pierde este lote; el siguiente lo intentará de nuevo.
  }
});

export async function loadPoints(): Promise<GeoPoint[]> {
  const raw = await AsyncStorage.getItem(STORAGE_KEY);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as GeoPoint[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export async function clearPoints(): Promise<void> {
  await AsyncStorage.removeItem(STORAGE_KEY);
}

export async function isTracking(): Promise<boolean> {
  try {
    return await Location.hasStartedLocationUpdatesAsync(GPS_TASK);
  } catch {
    return false;
  }
}

/** Pide permisos (primer plano y después «todo el tiempo») y arranca la tarea en segundo plano. */
export async function startTracking(): Promise<void> {
  const foreground = await Location.requestForegroundPermissionsAsync();
  if (!foreground.granted) {
    throw new AppError('Sin permiso de ubicación no se puede medir el viaje. Actívalo en los ajustes.');
  }
  const background = await Location.requestBackgroundPermissionsAsync();
  if (!background.granted) {
    throw new AppError(
      'Para medir el viaje con la pantalla apagada, elige «Permitir todo el tiempo» en los permisos de ubicación de Copi.',
      { code: 'BACKGROUND_DENIED' },
    );
  }
  if (await isTracking()) return;
  await Location.startLocationUpdatesAsync(GPS_TASK, {
    accuracy: Location.Accuracy.High,
    timeInterval: 5000,
    distanceInterval: 20,
    pausesUpdatesAutomatically: false,
    foregroundService: {
      notificationTitle: 'Copi está midiendo el viaje',
      notificationBody: 'Toca para volver a Copi',
      notificationColor: '#E8540A',
    },
  });
}

export async function stopTracking(): Promise<void> {
  if (await isTracking()) await Location.stopLocationUpdatesAsync(GPS_TASK);
}

export function openLocationSettings(): void {
  void Linking.openSettings();
}
