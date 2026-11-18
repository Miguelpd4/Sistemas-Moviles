import { toAppError } from '@/lib/errors';
import type { TripMetricsRow } from '@/types/database';

import { supabase } from './client';

/** Viaje (S2-08): iniciar, finalizar, puntos GPS y métricas. */

export type TripMetrics = TripMetricsRow;
export type TripPointInput = {
  lat: number;
  lon: number;
  accuracy: number | null;
  speed: number | null;
  timestamp: number;
};

export async function startTrip(sessionId: string, fuelPrice: number, lat: number, lon: number): Promise<void> {
  const { error } = await supabase.rpc('start_trip', {
    p_session_id: sessionId,
    p_fuel_price: fuelPrice,
    p_lat: lat,
    p_lon: lon,
  });
  if (error) throw toAppError(error, 'No se ha podido iniciar el viaje.');
}

export async function endTrip(sessionId: string, distanceM: number, lat: number | null, lon: number | null): Promise<void> {
  const { error } = await supabase.rpc('end_trip', {
    p_session_id: sessionId,
    p_distance_m: Math.max(0, Math.round(distanceM)),
    p_lat: lat,
    p_lon: lon,
  });
  if (error) throw toAppError(error, 'No se ha podido finalizar el viaje.');
}

export async function getTripMetrics(sessionId: string): Promise<TripMetrics | null> {
  const { data, error } = await supabase.from('trip_metrics').select('*').eq('session_id', sessionId).maybeSingle();
  if (error) throw toAppError(error, 'No se han podido cargar los datos del viaje.');
  return data;
}

export async function uploadPoints(sessionId: string, points: readonly TripPointInput[]): Promise<void> {
  if (points.length === 0) return;
  const { error } = await supabase.from('trip_points').insert(
    points.map((point) => ({
      session_id: sessionId,
      lat: point.lat,
      lon: point.lon,
      accuracy_m: point.accuracy,
      speed_mps: point.speed,
      recorded_at: new Date(point.timestamp).toISOString(),
    })),
  );
  if (error) throw toAppError(error, 'No se han podido guardar los puntos del viaje.');
}

export async function updateMetrics(sessionId: string, distanceM: number, last: { lat: number; lon: number } | null): Promise<void> {
  const { error } = await supabase
    .from('trip_metrics')
    .update({
      distance_m: Math.max(0, Math.round(distanceM)),
      ...(last ? { last_lat: last.lat, last_lon: last.lon } : {}),
      updated_at: new Date().toISOString(),
    })
    .eq('session_id', sessionId);
  if (error) throw toAppError(error, 'No se ha podido actualizar la distancia.');
}
