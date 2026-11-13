/** Validación de la cuenta del conductor (S1-07). Mismas reglas que las columnas de `profiles`. */

export type DriverFormValues = {
  email: string;
  password: string;
  displayName: string;
  phone: string;
  paypalUsername: string;
};

export type DriverFormErrors = Partial<Record<keyof DriverFormValues, string>>;

/** Quita espacios y guiones: "600 00 00 00" → "600000000". */
export function normalizePhone(raw: string): string {
  return raw.replace(/[\s-]/g, '');
}

export function isValidPhone(raw: string): boolean {
  return /^\+?[0-9]{9,15}$/.test(normalizePhone(raw));
}

/** Acepta "ana123" o la URL completa "paypal.me/ana123" y devuelve solo el usuario. */
export function normalizePaypal(raw: string): string {
  return raw.trim().replace(/^(https?:\/\/)?(www\.)?paypal\.me\//i, '').replace(/\/+$/, '');
}

export function isValidPaypal(raw: string): boolean {
  return /^[A-Za-z0-9]{1,20}$/.test(normalizePaypal(raw));
}

export function isValidEmail(raw: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(raw.trim());
}

/** Nombre, teléfono (opcional) y PayPal (opcional): lo que se puede editar después del registro. */
export function validateProfileFields(
  values: Pick<DriverFormValues, 'displayName' | 'phone' | 'paypalUsername'>,
): DriverFormErrors {
  const errors: DriverFormErrors = {};
  const name = values.displayName.trim();
  if (name.length < 1 || name.length > 30) errors.displayName = 'Escribe un nombre de 1 a 30 caracteres.';
  if (values.phone.trim() !== '' && !isValidPhone(values.phone)) {
    errors.phone = 'Escribe un teléfono de 9 a 15 cifras.';
  }
  if (values.paypalUsername.trim() !== '' && !isValidPaypal(values.paypalUsername)) {
    errors.paypalUsername = 'Escribe solo tu usuario de PayPal.me (letras y números).';
  }
  return errors;
}

/** `mode = 'signin'` solo comprueba email y contraseña. */
export function validateDriverForm(values: DriverFormValues, mode: 'signup' | 'signin'): DriverFormErrors {
  const errors: DriverFormErrors = {};
  if (!isValidEmail(values.email)) errors.email = 'Escribe un email válido.';
  if (values.password.length < (mode === 'signup' ? 8 : 1)) {
    errors.password = mode === 'signup' ? 'La contraseña debe tener al menos 8 caracteres.' : 'Escribe tu contraseña.';
  }
  return mode === 'signin' ? errors : { ...errors, ...validateProfileFields(values) };
}
