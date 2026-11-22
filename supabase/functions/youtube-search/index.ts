// #54 · Búsqueda de canciones en YouTube para cualquier usuario de COPI (también anónimos).
// La clave de la YouTube Data API solo vive aquí: no es la cuenta de nadie, solo identifica a COPI.
// Secreto: Supabase → Edge Functions → Secrets → YOUTUBE_API_KEY
// Despliegue: npx supabase functions deploy youtube-search
//
// Devuelve los vídeos casi en bruto; la app los filtra y ordena con `toMusicTracks` (src/lib/youtube.ts).
// Cada búsqueda nueva gasta 101 unidades de las 10.000 diarias (unas 100 búsquedas al día).
import { isAuthenticated } from '../_shared/auth.ts';
import { corsHeaders, json } from '../_shared/cors.ts';

const API = 'https://www.googleapis.com/youtube/v3';
/** Las búsquedas repetidas no gastan cupo durante este tiempo (mientras la función siga viva). */
const CACHE_MS = 6 * 60 * 60 * 1000;
const CACHE_MAX = 200;

type RawVideo = {
  id: string;
  title: string;
  channelTitle: string;
  thumbnailUrl: string | null;
  duration: string | null;
  embeddable: boolean;
  blocked: boolean;
};

type Thumbnails = { medium?: { url?: string }; high?: { url?: string }; default?: { url?: string } };
type ApiError = { error?: { message?: string; errors?: { reason?: string }[] } };

const cache = new Map<string, { videos: RawVideo[]; at: number }>();

class YouTubeError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly code: string,
  ) {
    super(message);
  }
}

async function call<T>(path: string, params: Record<string, string>, key: string): Promise<T> {
  const response = await fetch(`${API}/${path}?${new URLSearchParams({ ...params, key }).toString()}`, {
    headers: { Accept: 'application/json' },
  });
  if (response.ok) return (await response.json()) as T;

  const body = (await response.json().catch(() => ({}))) as ApiError;
  const reason = body.error?.errors?.[0]?.reason ?? '';
  console.error('youtube-search', response.status, reason, body.error?.message);
  if (reason === 'quotaExceeded' || reason === 'dailyLimitExceeded' || reason === 'rateLimitExceeded') {
    throw new YouTubeError('Se han acabado las búsquedas de YouTube de hoy (unas 100 al día). Mañana vuelven.', 429, 'YOUTUBE_QUOTA');
  }
  if (reason === 'keyInvalid' || reason === 'accessNotConfigured' || reason === 'SERVICE_DISABLED' || response.status === 403) {
    throw new YouTubeError(
      'La clave de YouTube no es válida o no tiene activada la YouTube Data API v3. Revisa YOUTUBE_API_KEY en Supabase.',
      500,
      'YOUTUBE_CONFIG',
    );
  }
  throw new YouTubeError(`YouTube ha respondido con un error (${response.status}).`, 502, 'YOUTUBE_ERROR');
}

async function search(query: string, key: string): Promise<RawVideo[]> {
  const found = await call<{ items?: { id?: { videoId?: string } }[] }>(
    'search',
    {
      part: 'snippet',
      type: 'video',
      videoCategoryId: '10', // Música
      videoEmbeddable: 'true',
      regionCode: 'ES',
      relevanceLanguage: 'es',
      maxResults: '20',
      q: query,
    },
    key,
  );
  const ids = (found.items ?? []).map((item) => item.id?.videoId).filter((id): id is string => Boolean(id));
  if (ids.length === 0) return [];

  // Duración y si se puede reproducir fuera de YouTube (1 unidad más).
  const details = await call<{
    items?: {
      id?: string;
      snippet?: { title?: string; channelTitle?: string; thumbnails?: Thumbnails };
      contentDetails?: { duration?: string; contentRating?: { ytRating?: string } };
      status?: { embeddable?: boolean; privacyStatus?: string };
    }[];
  }>('videos', { part: 'snippet,contentDetails,status', id: ids.join(',') }, key);

  const byId = new Map((details.items ?? []).map((item) => [item.id ?? '', item]));
  return ids.flatMap((id) => {
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
        blocked:
          (privacy !== 'public' && privacy !== 'unlisted') || item.contentDetails?.contentRating?.ytRating === 'ytAgeRestricted',
      },
    ];
  });
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    if (!(await isAuthenticated(req))) return json({ error: 'Inicia sesión para buscar canciones.' }, 401);

    const { q } = (await req.json().catch(() => ({}))) as { q?: unknown };
    const query = typeof q === 'string' ? q.trim().slice(0, 100) : '';
    if (query.length < 2) return json({ videos: [] });

    const key = Deno.env.get('YOUTUBE_API_KEY');
    if (!key) {
      return json({ error: 'Falta YOUTUBE_API_KEY en los secretos de las Edge Functions de Supabase.', code: 'YOUTUBE_CONFIG' }, 500);
    }

    const cacheKey = query.toLowerCase();
    const hit = cache.get(cacheKey);
    if (hit && Date.now() - hit.at < CACHE_MS) return json({ videos: hit.videos });

    const videos = await search(query, key);
    if (cache.size >= CACHE_MAX) cache.delete(cache.keys().next().value ?? '');
    cache.set(cacheKey, { videos, at: Date.now() });
    return json({ videos });
  } catch (error) {
    if (error instanceof YouTubeError) return json({ error: error.message, code: error.code }, error.status);
    console.error('youtube-search', error);
    return json({ error: 'No se ha podido buscar en YouTube.' }, 500);
  }
});
