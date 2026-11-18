import AsyncStorage from '@react-native-async-storage/async-storage';

import type { TripPointInput } from '@/services/supabase/trip';

/**
 * Puntos del viaje guardados en el móvil del conductor (S2-08). Dos listas por viaje: todos los
 * puntos (para calcular la distancia) y los que aún no se han subido (por si no hay red).
 */
export type StoredPoint = TripPointInput;

const ACTIVE_KEY = 'copi:viaje:activo';
const allKey = (id: string) => `copi:viaje:${id}:puntos`;
const pendingKey = (id: string) => `copi:viaje:${id}:pendientes`;
const uploadKey = (id: string) => `copi:viaje:${id}:ultimaSubida`;

async function readList(key: string): Promise<StoredPoint[]> {
  const raw = await AsyncStorage.getItem(key);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as unknown;
    return Array.isArray(parsed) ? (parsed as StoredPoint[]) : [];
  } catch {
    return [];
  }
}

export async function getActiveTrip(): Promise<string | null> {
  return AsyncStorage.getItem(ACTIVE_KEY);
}

export async function setActiveTrip(sessionId: string): Promise<void> {
  await AsyncStorage.setItem(ACTIVE_KEY, sessionId);
}

export async function appendPoints(sessionId: string, points: readonly StoredPoint[]): Promise<void> {
  if (points.length === 0) return;
  const [all, pending] = await Promise.all([readList(allKey(sessionId)), readList(pendingKey(sessionId))]);
  await AsyncStorage.multiSet([
    [allKey(sessionId), JSON.stringify([...all, ...points])],
    [pendingKey(sessionId), JSON.stringify([...pending, ...points])],
  ]);
}

export async function getAllPoints(sessionId: string): Promise<StoredPoint[]> {
  return readList(allKey(sessionId));
}

export async function getPendingPoints(sessionId: string): Promise<StoredPoint[]> {
  return readList(pendingKey(sessionId));
}

/** Quita de pendientes los `count` primeros (los que se acaban de subir). */
export async function dropPending(sessionId: string, count: number): Promise<void> {
  const pending = await readList(pendingKey(sessionId));
  await AsyncStorage.setItem(pendingKey(sessionId), JSON.stringify(pending.slice(count)));
}

export async function getLastUpload(sessionId: string): Promise<number> {
  const raw = await AsyncStorage.getItem(uploadKey(sessionId));
  return raw ? Number(raw) || 0 : 0;
}

export async function setLastUpload(sessionId: string, at: number): Promise<void> {
  await AsyncStorage.setItem(uploadKey(sessionId), String(at));
}

export async function clearTrip(sessionId: string): Promise<void> {
  await AsyncStorage.multiRemove([allKey(sessionId), pendingKey(sessionId), uploadKey(sessionId)]);
  if ((await getActiveTrip()) === sessionId) await AsyncStorage.removeItem(ACTIVE_KEY);
}
