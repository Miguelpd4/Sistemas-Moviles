import { AppError } from '@/lib/errors';
import { toMusicTracks, type RawYouTubeVideo } from '@/lib/youtube';
import type { YouTubeTrack } from '@/types/youtube';

import { getYouTubeAccessToken, invalidateYouTubeToken } from './auth';
import { NOT_CONNECTED } from './config';

/**
 * Búsqueda de canciones en YouTube con la cuenta del conductor (#54). Cada búsqueda gasta unas
 * 101 unidades del cupo diario del proyecto de Google Cloud (10.000): unas 100 búsquedas al día.
 */

const API = 'https://www.googleapis.com/youtube/v3';
const MAX_RESULTS = 10;

type ApiErrorBody = { error?: { code?: number; message?: string; errors?: { reason?: string }[] } };

async function toApiError(response: Response): Promise<AppError> {
  let body: ApiErrorBody = {};
  try {
    body = (await response.json()) as ApiErrorBody;
  } catch {
    // Sin cuerpo JSON: se usa solo el código.
  }
  const reason = body.error?.errors?.[0]?.reason ?? '';
  const details = body.error?.message;
  if (response.status === 401) {
    return new AppError('La sesión de YouTube ha caducado. Vuelve a conectar tu cuenta de Google.', { code: NOT_CONNECTED, details });
  }
  if (reason === 'quotaExceeded' || reason === 'dailyLimitExceeded' || reason === 'rateLimitExceeded') {
    return new AppError('Se han acabado las búsquedas de YouTube de hoy (unas 100 al día). Mañana vuelven.', {
      code: 'YOUTUBE_QUOTA',
      details,
    });
  }
  if (reason === 'insufficientPermissions' || reason === 'ACCESS_TOKEN_SCOPE_INSUFFICIENT') {
    return new AppError('Falta el permiso de YouTube: desconecta y vuelve a conectar aceptándolo.', { code: NOT_CONNECTED, details });
  }
  if (reason === 'accessNotConfigured' || reason === 'SERVICE_DISABLED') {
    return new AppError('La YouTube Data API v3 no está activada en el proyecto de Google Cloud.', { code: 'YOUTUBE_CONFIG', details });
  }
  return new AppError(`YouTube ha respondido con un error (${response.status}${reason ? `: ${reason}` : ''}).`, { details });
}

async function call<T>(path: string, params: Record<string, string>, retried = false): Promise<T> {
  const token = await getYouTubeAccessToken();
  let response: Response;
  try {
    response = await fetch(`${API}/${path}?${new URLSearchParams(params).toString()}`, {
      headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
    });
  } catch (error) {
    throw new AppError('No hay conexión con YouTube. Revisa internet.', { details: error });
  }
  if (response.status === 401 && !retried) {
    // Token caducado antes de tiempo: se pide uno nuevo y se reintenta una vez.
    await invalidateYouTubeToken(token);
    return call<T>(path, params, true);
  }
  if (!response.ok) throw await toApiError(response);
  return (await response.json()) as T;
}

type Thumbnails = { medium?: { url?: string }; high?: { url?: string }; default?: { url?: string } };
type SearchResponse = { items?: { id?: { videoId?: string } }[] };
type VideosResponse = {
  items?: {
    id?: string;
    snippet?: { title?: string; channelTitle?: string; thumbnails?: Thumbnails };
    contentDetails?: { duration?: string; contentRating?: { ytRating?: string } };
    status?: { embeddable?: boolean; privacyStatus?: string };
  }[];
};

/** Canciones para `query`, con el audio oficial primero. Vacío si la búsqueda es muy corta. */
export async function searchYouTube(query: string): Promise<YouTubeTrack[]> {
  const q = query.trim();
  if (q.length < 2) return [];

  const search = await call<SearchResponse>('search', {
    part: 'snippet',
    type: 'video',
    videoCategoryId: '10', // Música
    videoEmbeddable: 'true',
    regionCode: 'ES',
    relevanceLanguage: 'es',
    maxResults: '20',
    q,
  });
  const ids = (search.items ?? []).map((item) => item.id?.videoId).filter((id): id is string => Boolean(id));
  if (ids.length === 0) return [];

  // Duración y si se puede reproducir fuera de YouTube (1 unidad más).
  const details = await call<VideosResponse>('videos', { part: 'snippet,contentDetails,status', id: ids.join(',') });
  const byId = new Map((details.items ?? []).map((item) => [item.id ?? '', item]));
  const raw: RawYouTubeVideo[] = ids.flatMap((id) => {
    const item = byId.get(id);
    if (!item) return [];
    const thumbs = item.snippet?.thumbnails;
    const privacy = item.status?.privacyStatus;
    return [
      {
        id,
        title: item.snippet?.title ?? '',
        channelTitle: item.snippet?.channelTitle ?? '',
        thumbnailUrl: thumbs?.medium?.url ?? thumbs?.high?.url ?? thumbs?.default?.url ?? null,
        duration: item.contentDetails?.duration ?? null,
        embeddable: item.status?.embeddable === true,
        blocked: (privacy !== 'public' && privacy !== 'unlisted') || item.contentDetails?.contentRating?.ytRating === 'ytAgeRestricted',
      },
    ];
  });
  return toMusicTracks(raw).slice(0, MAX_RESULTS);
}
