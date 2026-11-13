/** Validación del formulario del coche (S1-07). Lógica pura, sin React. */

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
  /** Tal como lo escribe el usuario: "6,5" o "6.5". */
  consumption: string;
  fuelType: FuelType | null;
  seats: number;
};

export type CarFormField = 'name' | 'consumption' | 'fuelType' | 'seats';
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
