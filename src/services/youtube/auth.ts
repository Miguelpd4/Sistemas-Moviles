import {
  GoogleSignin,
  isErrorWithCode,
  isSuccessResponse,
  statusCodes,
} from '@react-native-google-signin/google-signin';
import { useCallback, useEffect, useState } from 'react';

import { env } from '@/config/env';
import { AppError, errorMessage } from '@/lib/errors';

import { missingClientId, notConnected, YOUTUBE_SCOPE, type YouTubeLogin } from './config';

/**
 * Cuenta de Google del conductor en Android (#54), con el Google Sign-In nativo: Google ya no deja
 * volver a la app con `copi://` en los clientes OAuth de Android. La sesión la guarda Google Play
 * Services; aquí no se guarda ningún token.
 */

let configured = false;

function configure(): boolean {
  if (!env.googleWebClientId) return false;
  if (!configured) {
    GoogleSignin.configure({ webClientId: env.googleWebClientId, scopes: [YOUTUBE_SCOPE] });
    configured = true;
  }
  return true;
}

/** Errores del Google Sign-In con un mensaje que el conductor entienda. */
function toAuthError(error: unknown): AppError {
  if (error instanceof AppError) return error;
  if (isErrorWithCode(error)) {
    if (error.code === statusCodes.PLAY_SERVICES_NOT_AVAILABLE) {
      return new AppError('Este móvil no tiene Google Play Services actualizado: actualízalo e inténtalo otra vez.');
    }
    if (error.code === statusCodes.SIGN_IN_REQUIRED) return notConnected();
    if (error.code === statusCodes.IN_PROGRESS) return new AppError('Ya se está iniciando sesión con Google.');
    // 10 = DEVELOPER_ERROR: el cliente Android de Google Cloud no coincide con esta app.
    if (error.code === '10') {
      return new AppError(
        'Google no reconoce esta app: en Google Cloud falta el cliente Android con el paquete es.uco.copi y la huella SHA-1 del APK.',
        { code: 'YOUTUBE_CONFIG', details: error },
      );
    }
  }
  return new AppError(errorMessage(error, 'No se ha podido iniciar sesión con Google.'), { details: error });
}

/** Token de acceso del conductor para la API de YouTube. Google lo renueva solo si ha caducado. */
export async function getYouTubeAccessToken(): Promise<string> {
  if (!configure()) throw missingClientId();
  try {
    if (GoogleSignin.getCurrentUser() === null) {
      const response = await GoogleSignin.signInSilently();
      if (response.type !== 'success') throw notConnected();
    }
    const { accessToken } = await GoogleSignin.getTokens();
    return accessToken;
  } catch (error) {
    throw toAuthError(error);
  }
}

/** Si YouTube rechaza el token (401), se olvida para que Google dé uno nuevo. */
export async function invalidateYouTubeToken(token: string): Promise<void> {
  try {
    await GoogleSignin.clearCachedAccessToken(token);
  } catch {
    // Si no se puede borrar, el siguiente intento dará el mismo error y se pedirá volver a conectar.
  }
}

export function useYouTubeLogin(): YouTubeLogin {
  const ready = configure();
  const [account, setAccount] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(ready ? null : missingClientId().message);

  // Si ya había conectado otra vez, se recupera la sesión sin preguntar.
  useEffect(() => {
    if (!ready) return;
    let active = true;
    GoogleSignin.signInSilently()
      .then((response) => {
        if (active && response.type === 'success' && response.data.scopes.includes(YOUTUBE_SCOPE)) {
          setAccount(response.data.user.email);
        }
      })
      .catch(() => undefined);
    return () => {
      active = false;
    };
  }, [ready]);

  const login = useCallback(() => {
    setBusy(true);
    setError(null);
    const run = async () => {
      await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
      const response = await GoogleSignin.signIn();
      if (!isSuccessResponse(response)) return; // Ha cancelado.
      let scopes = response.data.scopes;
      if (!scopes.includes(YOUTUBE_SCOPE)) {
        const added = await GoogleSignin.addScopes({ scopes: [YOUTUBE_SCOPE] });
        scopes = added && isSuccessResponse(added) ? added.data.scopes : scopes;
      }
      if (!scopes.includes(YOUTUBE_SCOPE)) {
        throw new AppError('Sin el permiso de YouTube no se pueden buscar canciones. Vuelve a conectar y acéptalo.');
      }
      setAccount(response.data.user.email);
    };
    run()
      .catch((err: unknown) => setError(toAuthError(err).message))
      .finally(() => setBusy(false));
  }, []);

  const logout = useCallback(async () => {
    try {
      await GoogleSignin.signOut();
    } finally {
      setAccount(null);
    }
  }, []);

  return { ready, connected: account !== null, account, busy, error, login, logout };
}
