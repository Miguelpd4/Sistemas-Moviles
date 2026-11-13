import { generateCarCode } from '@/lib/carCode';
import { parseConsumption, type CarFormValues, type FuelType } from '@/lib/carForm';
import { AppError, toAppError } from '@/lib/errors';
import type { CarRow } from '@/types/database';

import { supabase } from './client';
import { uploadImage } from './storage';

export type Car = Omit<CarRow, 'fuel_type'> & { fuel_type: FuelType };

const UNIQUE_VIOLATION = '23505';

function toRow(values: CarFormValues) {
  const consumption = parseConsumption(values.consumption);
  if (consumption === null || values.fuelType === null) {
    throw new AppError('Revisa los datos del coche.');
  }
  return {
    name: values.name.trim(),
    consumption_l_100km: consumption,
    fuel_type: values.fuelType,
    seats: values.seats,
  };
}

/** El coche del conductor (el primero que registró). */
export async function getMyCar(userId: string): Promise<Car | null> {
  const { data, error } = await supabase
    .from('cars')
    .select('*')
    .eq('owner_id', userId)
    .order('created_at', { ascending: true })
    .limit(1)
    .maybeSingle();
  if (error) throw toAppError(error, 'No se ha podido cargar tu coche.');
  return data as Car | null;
}

/** Crea el coche con un código de pegatina nuevo; si el código ya existe, prueba otro (hasta 3 veces). */
export async function createCar(userId: string, values: CarFormValues, photoPath: string | null): Promise<Car> {
  const row = toRow(values);
  for (let attempt = 0; attempt < 3; attempt += 1) {
    const { data, error } = await supabase
      .from('cars')
      .insert({ ...row, owner_id: userId, photo_path: photoPath, nfc_code: generateCarCode() })
      .select('*')
      .single();
    if (!error) return data as Car;
    if (error.code !== UNIQUE_VIOLATION) throw toAppError(error, 'No se ha podido guardar el coche.');
  }
  throw new AppError('No se ha podido generar un código de pegatina. Vuelve a intentarlo.');
}

export async function updateCar(carId: string, values: CarFormValues, photoPath: string | null): Promise<Car> {
  const { data, error } = await supabase
    .from('cars')
    .update({ ...toRow(values), photo_path: photoPath })
    .eq('id', carId)
    .select('*')
    .single();
  if (error) throw toAppError(error, 'No se han podido guardar los cambios del coche.');
  return data as Car;
}

export function uploadCarPhoto(userId: string, uri: string): Promise<string> {
  return uploadImage('coches', userId, uri);
}
