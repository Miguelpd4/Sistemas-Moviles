import { ResponseType, useAuthRequest } from 'expo-auth-session';
import * as WebBrowser from 'expo-web-browser';
import { useCallback, useEffect, useState } from 'react';

import { env } from '@/config/env';
import { AppError } from '@/lib/errors';

import { GOOGLE_DISCOVERY, missingClientId, notConnected, YOUTUBE_SCOPE, youtubeRedirectUri, type YouTubeLogin } from './config';

WebBrowser.maybeCompleteAuthSession();

/**
 * Cuenta de Google del conductor en la web (#54): inicio de sesión de Google para navegadores con
 * token directo (sin secreto). El token dura 1 hora; después hay que volver a conectar.
 * Va en localStorage, solo en el navegador del conductor.
 */

const KEY = 'copi.youtube.token';
/** Se da por caducado si quedan menos de 60 segundos. */
const MARGIN_MS = 60_000;

type StoredToken = { accessToken: string; expiresAt: number };

function storage(): Storage | null {
  try {
    return typeof window !== 'undefined' ? window.localStorage : null;
  } catch {
    return null;
  }
}

function readToken(): StoredToken | null {
  try {
    const raw = storage()?.getItem(KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<StoredToken>;
    if (typeof parsed.accessToken === 'string' && typeof parsed.expiresAt === 'number') {
      return { accessToken: parsed.accessToken, expiresAt: parsed.expiresAt };
    }
  } catch {
    // Dañado: como si no hubiera.
  }
  return null;
}

function writeToken(token: StoredToken): void {
  const store = storage();
  if (!store) throw new AppError('Este navegador no deja guardar datos: no se puede conectar YouTube.');
  store.setItem(KEY, JSON.stringify(token));
}

function removeToken(): void {
  storage()?.removeItem(KEY);
}

export async function getYouTubeAccessToken(): Promise<string> {
  if (!env.googleWebClientId) throw missingClientId();
  const token = readToken();
  if (!token) throw notConnected();
  if (token.expiresAt - Date.now() < MARGIN_MS) {
    removeToken();
    throw notConnected('La sesión de YouTube ha caducado (en la web dura 1 hora). Vuelve a conectar YouTube.');
  }
  return token.accessToken;
}

export async function invalidateYouTubeToken(_token: string): Promise<void> {
  removeToken();
}

export function useYouTubeLogin(): YouTubeLogin {
  const clientId = env.googleWebClientId ?? '';
  const [request, response, promptAsync] = useAuthRequest(
    {
      clientId,
      scopes: [YOUTUBE_SCOPE],
      responseType: ResponseType.Token,
      redirectUri: youtubeRedirectUri(),
      usePKCE: false,
      extraParams: { include_granted_scopes: 'true' },
    },
    GOOGLE_DISCOVERY,
  );
  const [stored, setStored] = useState<StoredToken | null>(() => readToken());
  /** Respuesta ya usada o descartada (al desconectar o al volver a intentarlo). */
  const [dismissed, setDismissed] = useState<typeof response>(null);

  const auth = response !== dismissed && response?.type === 'success' ? response.authentication : null;
  const fromResponse: StoredToken | null =
    auth?.accessToken ? { accessToken: auth.accessToken, expiresAt: (auth.issuedAt + (auth.expiresIn ?? 3600)) * 1000 } : null;
  const accessToken = fromResponse?.accessToken ?? null;
  const expiresAt = fromResponse?.expiresAt ?? null;

  // El token recién recibido se guarda para getYouTubeAccessToken (lo usa la búsqueda).
  useEffect(() => {
    if (accessToken === null || expiresAt === null) return;
    try {
      writeToken({ accessToken, expiresAt });
    } catch {
      // El navegador no deja guardar: ya se avisa con `canStore`.
    }
  }, [accessToken, expiresAt]);
  const canStore = storage() !== null;

  const token = fromResponse ?? stored;
  const responseError =
    response !== dismissed && response?.type === 'error'
      ? (response.error?.message ?? 'Google ha rechazado el inicio de sesión.')
      : null;

  const login = useCallback(() => {
    setDismissed(response);
    void promptAsync();
  }, [promptAsync, response]);

  const logout = useCallback(async () => {
    removeToken();
    setStored(null);
    setDismissed(response);
  }, [response]);

  return {
    ready: request !== null && clientId !== '',
    connected: token !== null,
    account: null,
    busy: false,
    error: !clientId
      ? missingClientId().message
      : !canStore
        ? 'Este navegador no deja guardar datos (¿modo privado?): no se puede conectar YouTube.'
        : responseError,
    login,
    logout,
  };
}
