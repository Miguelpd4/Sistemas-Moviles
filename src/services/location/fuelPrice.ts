import type { FuelType } from '@/lib/carForm';
import { AppError, toAppError } from '@/lib/errors';
import { supabase } from '@/services/supabase/client';

export type FuelPrice = { priceEurL: number; stations: number; maxDistanceKm: number; cached: boolean; sourceMs: number };

/** Precio medio del combustible cerca de un punto (Edge Function fuel-price). */
export async function fetchFuelPrice(lat: number, lon: number, fuel: FuelType): Promise<FuelPrice> {
  const { data, error } = await supabase.functions.invoke<FuelPrice & { error?: string }>('fuel-price', {
    body: { lat, lon, fuel },
  });
  if (error) throw toAppError(error, 'No se ha podido consultar el precio del combustible.');
  if (!data || typeof data.priceEurL !== 'number') {
    throw new AppError(data?.error ?? 'Respuesta inesperada del precio del combustible.');
  }
  return data;
}
