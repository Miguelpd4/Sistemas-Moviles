/** Longitud permitida del código de coche grabado en la pegatina NFC. */
const CAR_CODE_PATTERN = /^[A-Z0-9]{4,12}$/;

/**
 * Normaliza el código de coche que llega en la URL de la pegatina (`/c/<codigo>`).
 * Devuelve `null` si el código no es válido, para mostrar un error claro al usuario.
 */
export function normalizeCarCode(raw: string | string[] | undefined): string | null {
  const value = Array.isArray(raw) ? raw[0] : raw;
  if (value === undefined) return null;

  const code = value.trim().toUpperCase();
  return CAR_CODE_PATTERN.test(code) ? code : null;
}
