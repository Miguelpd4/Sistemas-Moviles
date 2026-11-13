/** Longitud permitida del código de coche grabado en la pegatina NFC. */
const CAR_CODE_PATTERN = /^[A-Z0-9]{4,12}$/;

/** Letras y números sin O, 0, I ni 1, para que nadie los confunda al leerlos. */
export const CAR_CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

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

/** Genera un código de pegatina de 8 caracteres. `random` devuelve un número en [0, 1). */
export function generateCarCode(random: () => number = Math.random, length = 8): string {
  let code = '';
  for (let i = 0; i < length; i += 1) {
    const index = Math.min(CAR_CODE_ALPHABET.length - 1, Math.floor(random() * CAR_CODE_ALPHABET.length));
    code += CAR_CODE_ALPHABET.charAt(index);
  }
  return code;
}

/** URL que se graba en la pegatina: `https://<dominio>/c/<codigo>`. */
export function carStickerUrl(webUrl: string, code: string): string {
  return `${webUrl.replace(/\/+$/, '')}/c/${code}`;
}

/** Host (con puerto si lo hay) de una URL `http(s)://`, en minúsculas. */
export function hostOf(url: string): string | null {
  const match = /^https?:\/\/([^/?#]+)/i.exec(url.trim());
  return match?.[1] ? match[1].toLowerCase() : null;
}

/**
 * Lee el código de coche de la URL de una pegatina. Solo acepta `https`, el host esperado
 * y la ruta `/c/<codigo>` (con o sin barra final). No usa `URL` porque en Hermes está incompleto.
 */
export function parseCarCodeFromUrl(url: string, expectedHost: string): string | null {
  const match = /^https:\/\/([^/?#]+)(\/[^?#]*)?/i.exec(url.trim());
  if (!match?.[1]) return null;
  if (match[1].toLowerCase() !== expectedHost.toLowerCase()) return null;

  const path = /^\/c\/([^/]+)\/?$/.exec(match[2] ?? '');
  if (!path?.[1]) return null;

  let raw: string;
  try {
    raw = decodeURIComponent(path[1]);
  } catch {
    return null;
  }
  return normalizeCarCode(raw);
}
