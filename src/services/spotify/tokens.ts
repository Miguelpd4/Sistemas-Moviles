import { refreshAsync } from 'expo-auth-session';
import * as SecureStore from 'expo-secure-store';

import { env } from '@/config/env';
import { AppError } from '@/lib/errors';
import type { SpotifyTokens } from '@/types/spotify';

import { SPOTIFY_DISCOVERY } from './config';

const KEY = 'copi.spotify.tokens';
/** Se renueva si quedan menos de 60 segundos. */
const REFRESH_MARGIN_MS = 60_000;

export async function saveTokens(tokens: SpotifyTokens): Promise<void> {
  await SecureStore.setItemAsync(KEY, JSON.stringify(tokens));
}

export async function loadTokens(): Promise<SpotifyTokens | null> {
  const raw = await SecureStore.getItemAsync(KEY);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as Partial<SpotifyTokens>;
    if (typeof parsed.accessToken === 'string' && typeof parsed.refreshToken === 'string' && typeof parsed.expiresAt === 'number') {
      return { accessToken: parsed.accessToken, refreshToken: parsed.refreshToken, expiresAt: parsed.expiresAt };
    }
  } catch {
    // Datos dañados: se borran.
  }
  await clearTokens();
  return null;
}

export async function clearTokens(): Promise<void> {
  await SecureStore.deleteItemAsync(KEY);
}

/** Token válido para llamar a la API; lo renueva con el refresh token si está a punto de caducar. */
export async function getValidAccessToken(): Promise<string> {
  const tokens = await loadTokens();
  if (!tokens) throw new AppError('Conecta tu cuenta de Spotify.', { code: 'SPOTIFY_NOT_CONNECTED' });
  if (tokens.expiresAt - Date.now() > REFRESH_MARGIN_MS) return tokens.accessToken;
  return refreshTokens(tokens);
}

export async function refreshTokens(tokens: SpotifyTokens): Promise<string> {
  if (!env.spotifyClientId) throw new AppError('Falta EXPO_PUBLIC_SPOTIFY_CLIENT_ID en .env.');
  try {
    const result = await refreshAsync({ clientId: env.spotifyClientId, refreshToken: tokens.refreshToken }, SPOTIFY_DISCOVERY);
    const next: SpotifyTokens = {
      accessToken: result.accessToken,
      // Spotify puede devolver un refresh token nuevo; si no, se mantiene el anterior.
      refreshToken: result.refreshToken ?? tokens.refreshToken,
      expiresAt: Date.now() + (result.expiresIn ?? 3600) * 1000,
    };
    await saveTokens(next);
    return next.accessToken;
  } catch (error) {
    await clearTokens();
    throw new AppError('La sesión de Spotify ha caducado. Vuelve a conectar tu cuenta.', {
      code: 'SPOTIFY_NOT_CONNECTED',
      details: error,
    });
  }
}

/** Para probar la renovación sin esperar una hora. */
export async function expireTokensForTesting(): Promise<void> {
  const tokens = await loadTokens();
  if (tokens) await saveTokens({ ...tokens, expiresAt: Date.now() - 1000 });
}
