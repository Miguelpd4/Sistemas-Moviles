/** Validación del formulario del coche (S1-07). Lógica pura, sin React. */
import type { CarColor } from './carColors';

export type FuelType = 'gasolina_95' | 'gasolina_98' | 'diesel' | 'glp';

export const FUEL_TYPES: readonly { value: FuelType; label: string }[] = [
  { value: 'gasolina_95', label: 'Gasolina 95' },
  { value: 'gasolina_98', label: 'Gasolina 98' },
  { value: 'diesel', label: 'Diésel' },
  { value: 'glp', label: 'GLP' },
];

export const MIN_SEATS = 2;
export const MAX_SEATS = 9;
export const MAX_CONSUMPTION = 30;

export type CarFormValues = {
  name: string;
  /** Marca y modelo: libres, con sugerencias del catálogo (src/lib/carCatalog.ts). */
  make: string;
  model: string;
  /** Versión o generación, opcional: «V», «2019», «Sportourer»… */
  version: string;
  /** Clave de src/lib/carColors.ts, o null si no se elige. */
  color: CarColor | null;
  /** Tal como lo escribe el usuario: "6,5" o "6.5". */
  consumption: string;
  fuelType: FuelType | null;
  seats: number;
};

export type CarFormField = 'name' | 'make' | 'model' | 'version' | 'consumption' | 'fuelType' | 'seats';
export type CarFormErrors = Partial<Record<CarFormField, string>>;

/** "6,5" → 6.5. Acepta coma o punto. Redondea a 1 decimal (como la columna numeric(4,1)). */
export function parseConsumption(raw: string): number | null {
  const text = raw.trim().replace(',', '.');
  if (!/^\d+(\.\d+)?$/.test(text)) return null;
  const value = Math.round(Number(text) * 10) / 10;
  return Number.isFinite(value) ? value : null;
}

export function validateCarForm(values: CarFormValues): CarFormErrors {
  const errors: CarFormErrors = {};
  const name = values.name.trim();
  if (name.length < 1 || name.length > 40) {
    errors.name = 'Escribe un nombre de 1 a 40 caracteres.';
  }
  if (values.make.trim().length > 30) errors.make = 'La marca puede tener como mucho 30 caracteres.';
  if (values.model.trim().length > 40) errors.model = 'El modelo puede tener como mucho 40 caracteres.';
  if (values.model.trim() !== '' && values.make.trim() === '') errors.make = 'Escribe también la marca.';
  if (values.version.trim().length > 40) errors.version = 'La versión puede tener como mucho 40 caracteres.';
  const consumption = parseConsumption(values.consumption);
  if (consumption === null || consumption <= 0 || consumption > MAX_CONSUMPTION) {
    errors.consumption = 'Escribe el consumo en litros cada 100 km, por ejemplo 6,5.';
  }
  if (values.fuelType === null || !FUEL_TYPES.some((fuel) => fuel.value === values.fuelType)) {
    errors.fuelType = 'Elige el combustible.';
  }
  if (!Number.isInteger(values.seats) || values.seats < MIN_SEATS || values.seats > MAX_SEATS) {
    errors.seats = `Las plazas van de ${MIN_SEATS} a ${MAX_SEATS}.`;
  }
  return errors;
}

export function hasErrors(errors: Partial<Record<string, string>>): boolean {
  return Object.values(errors).some((message) => message !== undefined);
}
