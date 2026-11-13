import NfcManager, { Ndef, NfcTech, type TagEvent } from 'react-native-nfc-manager';

import { env } from '@/config/env';
import { hostOf, parseCarCodeFromUrl } from '@/lib/carCode';
import { AppError } from '@/lib/errors';

/**
 * Lector NFC dentro de la app (S1-05), solo Android. Con la app cerrada no hace falta:
 * Android abre la URL de la pegatina con el App Link. En la web se usa reader.web.ts.
 */

/** Error de cancelación: la pantalla no muestra mensaje. */
export const NFC_CANCELLED = 'NFC_CANCELLED';

let started = false;
let cancelledByUser = false;

async function ensureStarted(): Promise<void> {
  if (!started) {
    await NfcManager.start();
    started = true;
  }
}

/** true si el móvil tiene NFC (aunque esté apagado). */
export async function isNfcSupported(): Promise<boolean> {
  try {
    return await NfcManager.isSupported();
  } catch {
    return false;
  }
}

function urlsFromTag(tag: TagEvent | null): string[] {
  const records = tag?.ndefMessage ?? [];
  const urls: string[] = [];
  for (const record of records) {
    if (!Ndef.isType(record, Ndef.TNF_WELL_KNOWN, Ndef.RTD_URI)) continue;
    try {
      urls.push(Ndef.uri.decodePayload(new Uint8Array(record.payload)));
    } catch {
      // Registro mal formado: se ignora.
    }
  }
  return urls;
}

/** Espera a que se acerque una pegatina y devuelve el código del coche. */
export async function readCarCode(): Promise<string> {
  cancelledByUser = false;
  try {
    await ensureStarted();
    if (!(await NfcManager.isSupported())) {
      throw new AppError('Este móvil no tiene NFC. Escanea el QR del conductor con la cámara.', { code: 'NFC_UNSUPPORTED' });
    }
    if (!(await NfcManager.isEnabled())) {
      throw new AppError('Activa el NFC en los ajustes del móvil y vuelve a intentarlo.', { code: 'NFC_DISABLED' });
    }

    await NfcManager.requestTechnology(NfcTech.Ndef);
    const tag = await NfcManager.getTag();
    const host = hostOf(env.webUrl) ?? '';
    const code = urlsFromTag(tag)
      .map((url) => parseCarCodeFromUrl(url, host))
      .find((value): value is string => value !== null);
    if (!code) {
      throw new AppError('Esta pegatina no es de Copi.', { code: 'NOT_A_COPI_TAG' });
    }
    return code;
  } catch (error) {
    if (cancelledByUser) throw new AppError('Lectura cancelada.', { code: NFC_CANCELLED });
    if (error instanceof AppError) throw error;
    throw new AppError('No se ha podido leer la pegatina. Mantén el móvil quieto sobre ella y vuelve a intentarlo.', {
      details: error,
    });
  } finally {
    await NfcManager.cancelTechnologyRequest().catch(() => undefined);
  }
}

/** Cancela una lectura en curso (botón «Cancelar»). */
export async function cancelRead(): Promise<void> {
  cancelledByUser = true;
  await NfcManager.cancelTechnologyRequest().catch(() => undefined);
}
