import { refreshAsync } from 'expo-auth-session';

import { env } from '@/config/env';
import { AppError } from '@/lib/errors';
import type { SpotifyTokens } from '@/types/spotify';

import { SPOTIFY_DISCOVERY } from './config';

/** Se renueva si quedan menos de 60 segundos. */
const REFRESH_MARGIN_MS = 60_000;

/** Dónde se guardan los tokens: SecureStore en Android, localStorage en la web. */
export type TokenStorage = {
  read: () => Promise<string | null>;
  write: (value: string) => Promise<void>;
  remove: () => Promise<void>;
};

/** Los tokens guardados, o null si no hay o están dañados. */
export function parseTokens(raw: string | null): SpotifyTokens | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as Partial<SpotifyTokens>;
    if (typeof parsed.accessToken === 'string' && typeof parsed.refreshToken === 'string' && typeof parsed.expiresAt === 'number') {
      return { accessToken: parsed.accessToken, refreshToken: parsed.refreshToken, expiresAt: parsed.expiresAt };
    }
  } catch {
    // Datos dañados: se tratan como si no hubiera.
  }
  return null;
}

/**
 * Guardar, leer y renovar los tokens de Spotify del conductor. La lógica es la misma en Android y
 * en la web; solo cambia dónde se guardan (`storage`).
 */
export function createTokenStore(storage: TokenStorage) {
  async function saveTokens(tokens: SpotifyTokens): Promise<void> {
    await storage.write(JSON.stringify(tokens));
  }

  async function clearTokens(): Promise<void> {
    await storage.remove();
  }

  async function loadTokens(): Promise<SpotifyTokens | null> {
    const raw = await storage.read();
    const tokens = parseTokens(raw);
    if (raw && !tokens) await clearTokens();
    return tokens;
  }

  async function refreshTokens(tokens: SpotifyTokens): Promise<string> {
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

  /** Token válido para llamar a la API; lo renueva con el refresh token si está a punto de caducar. */
  async function getValidAccessToken(): Promise<string> {
    const tokens = await loadTokens();
    if (!tokens) throw new AppError('Conecta tu cuenta de Spotify.', { code: 'SPOTIFY_NOT_CONNECTED' });
    if (tokens.expiresAt - Date.now() > REFRESH_MARGIN_MS) return tokens.accessToken;
    return refreshTokens(tokens);
  }

  /** Para probar la renovación sin esperar una hora. */
  async function expireTokensForTesting(): Promise<void> {
    const tokens = await loadTokens();
    if (tokens) await saveTokens({ ...tokens, expiresAt: Date.now() - 1000 });
  }

  return { saveTokens, loadTokens, clearTokens, getValidAccessToken, refreshTokens, expireTokensForTesting };
}
