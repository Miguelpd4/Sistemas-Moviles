import { AppError } from '@/lib/errors';
import type { SpotifyTokens } from '@/types/spotify';

/** En la web nadie reproduce: solo el móvil Android del conductor se conecta a Spotify. */
const notAvailable = () => new AppError('La reproducción de Spotify solo funciona en el móvil del conductor.');

export async function saveTokens(_tokens: SpotifyTokens): Promise<void> {
  throw notAvailable();
}
export async function loadTokens(): Promise<SpotifyTokens | null> {
  return null;
}
export async function clearTokens(): Promise<void> {
  // Nada guardado en la web.
}
export async function getValidAccessToken(): Promise<string> {
  throw notAvailable();
}
export async function refreshTokens(_tokens: SpotifyTokens): Promise<string> {
  throw notAvailable();
}
export async function expireTokensForTesting(): Promise<void> {
  // Nada guardado en la web.
}
