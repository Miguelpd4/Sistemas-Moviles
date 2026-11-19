import { exchangeCodeAsync, useAuthRequest } from 'expo-auth-session';
import * as WebBrowser from 'expo-web-browser';
import { useCallback, useEffect, useState } from 'react';

import { env } from '@/config/env';
import { errorMessage } from '@/lib/errors';

import { SPOTIFY_DISCOVERY, SPOTIFY_SCOPES, spotifyRedirectUri } from './config';
import { clearTokens, loadTokens, saveTokens } from './tokens';

WebBrowser.maybeCompleteAuthSession();

/**
 * Inicio de sesión del conductor en Spotify con PKCE (S1-09). Sin secreto en la app:
 * el código se cambia por tokens con el code_verifier de la petición.
 */
export function useSpotifyLogin() {
  const clientId = env.spotifyClientId ?? '';
  const redirectUri = spotifyRedirectUri();
  const [request, response, promptAsync] = useAuthRequest(
    { clientId, scopes: SPOTIFY_SCOPES, usePKCE: true, redirectUri },
    SPOTIFY_DISCOVERY,
  );
  const [connected, setConnected] = useState(false);
  /** Código de Spotify ya cambiado por tokens (con éxito o no). */
  const [settledCode, setSettledCode] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(clientId ? null : 'Falta EXPO_PUBLIC_SPOTIFY_CLIENT_ID en .env.');
  /** Respuesta de error que el usuario ya ha descartado al volver a intentarlo. */
  const [dismissed, setDismissed] = useState<typeof response>(null);

  useEffect(() => {
    void loadTokens().then((tokens) => setConnected(tokens !== null));
  }, []);

  const code = response?.type === 'success' ? (response.params.code ?? null) : null;
  const busy = code !== null && settledCode !== code;
  const responseError =
    response?.type === 'error' && response !== dismissed ? (response.error?.message ?? 'Spotify ha rechazado el inicio de sesión.') : null;

  useEffect(() => {
    // Cada código se cambia una sola vez.
    if (code === null || code === settledCode || !request?.codeVerifier) return;
    exchangeCodeAsync(
      { clientId, code, redirectUri, extraParams: { code_verifier: request.codeVerifier } },
      SPOTIFY_DISCOVERY,
    )
      .then(async (result) => {
        if (!result.refreshToken) throw new Error('Spotify no ha devuelto refresh token');
        await saveTokens({
          accessToken: result.accessToken,
          refreshToken: result.refreshToken,
          expiresAt: Date.now() + (result.expiresIn ?? 3600) * 1000,
        });
        setConnected(true);
        setError(null);
      })
      .catch((err: unknown) => setError(errorMessage(err, 'No se ha podido conectar con Spotify.')))
      .finally(() => setSettledCode(code));
  }, [code, settledCode, request, clientId, redirectUri]);

  const login = useCallback(() => {
    setError(null);
    setDismissed(response);
    void promptAsync();
  }, [promptAsync, response]);

  const logout = useCallback(async () => {
    await clearTokens();
    setConnected(false);
  }, []);

  return { ready: request !== null && clientId !== '', connected, busy, error: responseError ?? error, login, logout, redirectUri };
}
