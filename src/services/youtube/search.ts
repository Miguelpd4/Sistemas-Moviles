import { FunctionsHttpError } from '@supabase/supabase-js';

import { AppError, toAppError } from '@/lib/errors';
import { toMusicTracks, type RawYouTubeVideo } from '@/lib/youtube';
import { supabase } from '@/services/supabase/client';
import type { YouTubeTrack } from '@/types/youtube';

/** Canciones que se muestran por búsqueda. */
const MAX_RESULTS = 10;

type SearchResponse = { videos?: RawYouTubeVideo[]; error?: string; code?: string };

/**
 * Busca canciones en YouTube a través de la Edge Function youtube-search (#54). La clave de YouTube
 * solo está en Supabase: nadie inicia sesión en Google y sirve para cualquier usuario de COPI.
 * Devuelve el audio oficial primero y solo lo que se puede reproducir dentro de la app.
 */
export async function searchYouTube(query: string): Promise<YouTubeTrack[]> {
  const q = query.trim();
  if (q.length < 2) return [];
  const { data, error } = await supabase.functions.invoke<SearchResponse>('youtube-search', { body: { q } });
  if (error) {
    // La función devuelve un mensaje claro (cupo agotado, clave mal puesta): se enseña tal cual.
    if (error instanceof FunctionsHttpError) {
      const body = (await error.context.json().catch(() => null)) as SearchResponse | null;
      if (body?.error) throw new AppError(body.error, { code: body.code, details: error });
    }
    throw toAppError(error, 'No se ha podido buscar en YouTube. Vuelve a intentarlo.');
  }
  if (!data || !Array.isArray(data.videos)) throw new AppError(data?.error ?? 'Respuesta inesperada del buscador.');
  return toMusicTracks(data.videos).slice(0, MAX_RESULTS);
}
