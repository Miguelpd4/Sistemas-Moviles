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
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(clientId ? null : 'Falta EXPO_PUBLIC_SPOTIFY_CLIENT_ID en .env.');

  useEffect(() => {
    void loadTokens().then((tokens) => setConnected(tokens !== null));
  }, []);

  useEffect(() => {
    if (response?.type === 'error') {
      setError(response.error?.message ?? 'Spotify ha rechazado el inicio de sesión.');
      return;
    }
    if (response?.type !== 'success' || !request?.codeVerifier) return;
    const code = response.params.code;
    if (!code) return;

    setBusy(true);
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
      .finally(() => setBusy(false));
  }, [response, request, clientId, redirectUri]);

  const login = useCallback(() => {
    setError(null);
    void promptAsync();
  }, [promptAsync]);

  const logout = useCallback(async () => {
    await clearTokens();
    setConnected(false);
  }, []);

  return { ready: request !== null && clientId !== '', connected, busy, error, login, logout, redirectUri };
}
