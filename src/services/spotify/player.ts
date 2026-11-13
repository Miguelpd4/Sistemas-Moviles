import { AppError } from '@/lib/errors';
import type { PlaybackState, SpotifyDevice } from '@/types/spotify';

import { getValidAccessToken } from './tokens';

/** Control de la reproducción en el móvil del conductor con la Web API de Spotify (S1-09). */

const API = 'https://api.spotify.com/v1/me/player';

type Init = { method?: 'GET' | 'PUT' | 'POST'; body?: unknown; query?: string };

async function call(path: string, { method = 'GET', body, query }: Init = {}): Promise<Response> {
  const token = await getValidAccessToken();
  const url = `${API}${path}${query ? `?${query}` : ''}`;
  let response: Response;
  try {
    response = await fetch(url, {
      method,
      headers: {
        Authorization: `Bearer ${token}`,
        ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}),
      },
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
  } catch (error) {
    throw new AppError('No hay conexión con Spotify. Revisa internet.', { details: error });
  }
  if (response.status === 401) {
    throw new AppError('La sesión de Spotify ha caducado. Vuelve a conectar tu cuenta.', { code: 'SPOTIFY_NOT_CONNECTED' });
  }
  if (response.status === 403) {
    throw new AppError('Spotify no deja controlar la reproducción: hace falta una cuenta Premium añadida a la app de desarrollo.', {
      code: 'SPOTIFY_FORBIDDEN',
    });
  }
  if (response.status === 404) {
    throw new AppError('Abre Spotify en este móvil y vuelve a intentarlo.', { code: 'NO_ACTIVE_DEVICE' });
  }
  if (response.status === 429) {
    throw new AppError('Demasiadas peticiones a Spotify. Espera unos segundos.', { code: 'SPOTIFY_RATE_LIMIT' });
  }
  if (!response.ok) {
    throw new AppError(`Spotify ha respondido con un error (${response.status}).`);
  }
  return response;
}

export async function getDevices(): Promise<SpotifyDevice[]> {
  const response = await call('/devices');
  const json = (await response.json()) as { devices?: SpotifyDevice[] };
  return json.devices ?? [];
}

export async function transferTo(deviceId: string): Promise<void> {
  await call('', { method: 'PUT', body: { device_ids: [deviceId], play: false } });
}

/** El dispositivo de este móvil: el activo, o el primero de tipo Smartphone. */
async function findPhoneDevice(): Promise<SpotifyDevice | null> {
  const devices = await getDevices();
  return devices.find((d) => d.is_active) ?? devices.find((d) => d.type.toLowerCase() === 'smartphone') ?? null;
}

/**
 * Reproduce una canción desde `positionMs`. Si Spotify no tiene dispositivo activo, busca el del
 * móvil, le pasa la reproducción y reintenta una vez.
 */
export async function playTrack(trackId: string, positionMs = 0): Promise<void> {
  const body = { uris: [`spotify:track:${trackId}`], position_ms: Math.max(0, Math.round(positionMs)) };
  try {
    await call('/play', { method: 'PUT', body });
  } catch (error) {
    if (!(error instanceof AppError) || error.code !== 'NO_ACTIVE_DEVICE') throw error;
    const device = await findPhoneDevice();
    if (!device?.id) throw error;
    await transferTo(device.id);
    await call('/play', { method: 'PUT', body, query: `device_id=${encodeURIComponent(device.id)}` });
  }
}

export async function pause(): Promise<void> {
  await call('/pause', { method: 'PUT' });
}

/** Lo que suena ahora, o null si no suena nada (Spotify responde 204). */
export async function getCurrentlyPlaying(): Promise<PlaybackState | null> {
  const response = await call('/currently-playing');
  if (response.status === 204) return null;
  const json = (await response.json()) as {
    is_playing?: boolean;
    progress_ms?: number | null;
    item?: { id?: string; name?: string; duration_ms?: number } | null;
  };
  return {
    trackId: json.item?.id ?? null,
    title: json.item?.name ?? null,
    progressMs: json.progress_ms ?? 0,
    durationMs: json.item?.duration_ms ?? 0,
    isPlaying: json.is_playing ?? false,
  };
}
