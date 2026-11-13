import { AppError } from '@/lib/errors';

/** En la web no hay NFC: el iPhone abre la URL de la pegatina en Safari por sí solo. */
export const NFC_CANCELLED = 'NFC_CANCELLED';

export async function isNfcSupported(): Promise<boolean> {
  return false;
}

export async function readCarCode(): Promise<string> {
  throw new AppError('La lectura de pegatinas desde la app solo está disponible en Android.', { code: 'NFC_UNSUPPORTED' });
}

export async function cancelRead(): Promise<void> {
  // Nada que cancelar en la web.
}
