import { generateCarCode } from '@/lib/carCode';
import { parseConsumption, type CarFormValues, type FuelType } from '@/lib/carForm';
import { AppError, toAppError } from '@/lib/errors';
import { fetchCarModelImage } from '@/services/carImage';
import type { CarRow } from '@/types/database';

import { supabase } from './client';
import type { CarLook } from './sessions';
import { uploadImage } from './storage';

export type Car = Omit<CarRow, 'fuel_type'> & { fuel_type: FuelType };

const UNIQUE_VIOLATION = '23505';

const emptyToNull = (text: string) => (text.trim() === '' ? null : text.trim());

function toRow(values: CarFormValues) {
  const consumption = parseConsumption(values.consumption);
  if (consumption === null || values.fuelType === null) {
    throw new AppError('Revisa los datos del coche.');
  }
  return {
    name: values.name.trim(),
    make: emptyToNull(values.make),
    model: emptyToNull(values.model),
    version: emptyToNull(values.version),
    color: values.color,
    consumption_l_100km: consumption,
    fuel_type: values.fuelType,
    seats: values.seats,
  };
}

/**
 * Foto del modelo: se vuelve a buscar solo si cambian la marca, el modelo o la versión.
 * Si la búsqueda falla, el coche se guarda igual (se mostrará la silueta).
 */
async function resolveModelImage(values: CarFormValues, previous: Car | null): Promise<string | null> {
  const make = values.make.trim();
  const model = values.model.trim();
  if (!make || !model) return null;
  const unchanged =
    previous !== null &&
    (previous.make ?? '') === make &&
    (previous.model ?? '') === model &&
    (previous.version ?? '') === values.version.trim();
  if (unchanged && previous.model_image_url) return previous.model_image_url;
  return fetchCarModelImage(make, model, values.version);
}

/** Datos para dibujar el coche. */
export function carLook(car: Car): CarLook {
  return {
    name: car.name,
    make: car.make,
    model: car.model,
    version: car.version,
    color: car.color,
    photoPath: car.photo_path,
    imageUrl: car.model_image_url,
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
  const modelImageUrl = await resolveModelImage(values, null);
  for (let attempt = 0; attempt < 3; attempt += 1) {
    const { data, error } = await supabase
      .from('cars')
      .insert({ ...row, model_image_url: modelImageUrl, owner_id: userId, photo_path: photoPath, nfc_code: generateCarCode() })
      .select('*')
      .single();
    if (!error) return data as Car;
    if (error.code !== UNIQUE_VIOLATION) throw toAppError(error, 'No se ha podido guardar el coche.');
  }
  throw new AppError('No se ha podido generar un código de pegatina. Vuelve a intentarlo.');
}

export async function updateCar(previous: Car, values: CarFormValues, photoPath: string | null): Promise<Car> {
  const modelImageUrl = await resolveModelImage(values, previous);
  const { data, error } = await supabase
    .from('cars')
    .update({ ...toRow(values), model_image_url: modelImageUrl, photo_path: photoPath })
    .eq('id', previous.id)
    .select('*')
    .single();
  if (error) throw toAppError(error, 'No se han podido guardar los cambios del coche.');
  return data as Car;
}

export function uploadCarPhoto(userId: string, uri: string): Promise<string> {
  return uploadImage('coches', userId, uri);
}
