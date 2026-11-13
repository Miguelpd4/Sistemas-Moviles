import { AppError, toAppError } from '@/lib/errors';
import { supabase } from '@/services/supabase/client';
import type { SpotifyTrack } from '@/types/spotify';

/** Busca canciones a través de la Edge Function spotify-search (sirve también para anónimos). */
export async function searchTracks(query: string): Promise<SpotifyTrack[]> {
  const q = query.trim();
  if (q.length < 2) return [];
  const { data, error } = await supabase.functions.invoke<{ tracks?: SpotifyTrack[]; error?: string }>(
    'spotify-search',
    { body: { q } },
  );
  if (error) throw toAppError(error, 'No se ha podido buscar en Spotify. Vuelve a intentarlo.');
  if (!data || !Array.isArray(data.tracks)) {
    throw new AppError(data?.error ?? 'Respuesta inesperada del buscador.');
  }
  return data.tracks;
}
