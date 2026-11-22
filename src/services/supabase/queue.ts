import { AppError, toAppError } from '@/lib/errors';
import type { MusicQueueRow } from '@/types/database';
import type { YouTubeTrack } from '@/types/youtube';

import { supabase } from './client';

/** Cola de música de la sala (S2-05, S2-06, S2-07). */

export type QueueRow = MusicQueueRow;
export type SkipResult = { votes: number; needed: number; skipped: boolean };

/** Canciones que aún cuentan: en cola o sonando, por orden de llegada. */
export async function getQueue(sessionId: string): Promise<QueueRow[]> {
  const { data, error } = await supabase
    .from('music_queue')
    .select('*')
    .eq('session_id', sessionId)
    .in('status', ['en_cola', 'sonando'])
    .order('created_at', { ascending: true });
  if (error) throw toAppError(error, 'No se ha podido cargar la cola.');
  return data;
}

export async function addToQueue(sessionId: string, userId: string, track: YouTubeTrack): Promise<void> {
  const { error } = await supabase.from('music_queue').insert({
    session_id: sessionId,
    added_by: userId,
    source: 'youtube',
    track_id: track.videoId,
    title: track.title,
    artist: track.artist,
    album_art_url: track.thumbnailUrl,
    duration_ms: Math.max(1, Math.round(track.durationMs)),
  });
  if (error) throw toAppError(error, 'No se ha podido añadir la canción.');
}

/** Turnos de DJ (#20): añade la canción de mi turno (el servidor comprueba que me toca). */
export async function addDjSong(roundId: string, track: YouTubeTrack): Promise<void> {
  const { error } = await supabase.rpc('add_dj_song', {
    p_round_id: roundId,
    p_track_id: track.videoId,
    p_title: track.title,
    p_artist: track.artist,
    p_album_art_url: track.thumbnailUrl,
    p_duration_ms: Math.max(1, Math.round(track.durationMs)),
  });
  if (error) throw toAppError(error, 'No se ha podido añadir la canción.');
}

/** Canciones de una ronda de DJ, en cualquier estado y por orden de llegada. */
export async function getDjSongs(roundId: string): Promise<QueueRow[]> {
  const { data, error } = await supabase
    .from('music_queue')
    .select('*')
    .eq('dj_round_id', roundId)
    .order('created_at', { ascending: true });
  if (error) throw toAppError(error, 'No se han podido cargar las canciones de la ronda.');
  return data;
}

export async function removeFromQueue(id: string): Promise<void> {
  const { error } = await supabase.from('music_queue').delete().eq('id', id);
  if (error) throw toAppError(error, 'No se ha podido quitar la canción.');
}

export async function voteSkip(id: string): Promise<SkipResult> {
  const { data, error } = await supabase.rpc('vote_skip', { p_queue_id: id });
  if (error) throw toAppError(error, 'No se ha podido votar.');
  if (typeof data !== 'object' || data === null || Array.isArray(data)) {
    throw new AppError('Respuesta inesperada del servidor.');
  }
  return { votes: Number(data.votes ?? 0), needed: Number(data.needed ?? 1), skipped: data.skipped === true };
}

/** Conductor o copiloto (#60): pasa a la siguiente canción sin votar (el servidor lo comprueba). */
export async function skipSong(id: string): Promise<void> {
  const { error } = await supabase.rpc('skip_song', { p_queue_id: id });
  if (error) throw toAppError(error, 'No se ha podido pasar a la siguiente canción.');
}

export async function getVotes(queueId: string): Promise<string[]> {
  const { data, error } = await supabase.from('queue_votes').select('user_id').eq('queue_id', queueId);
  if (error) throw toAppError(error, 'No se han podido cargar los votos.');
  return data.map((row) => row.user_id);
}

/** Solo el conductor (RLS): marca una canción como sonando o terminada. */
export async function markPlaying(id: string): Promise<void> {
  const { error } = await supabase
    .from('music_queue')
    .update({ status: 'sonando', started_at: new Date().toISOString() })
    .eq('id', id)
    .eq('status', 'en_cola');
  if (error) throw toAppError(error, 'No se ha podido actualizar la cola.');
}

export async function markFinished(id: string): Promise<void> {
  const { error } = await supabase
    .from('music_queue')
    .update({ status: 'reproducida', ended_at: new Date().toISOString() })
    .eq('id', id)
    .eq('status', 'sonando');
  if (error) throw toAppError(error, 'No se ha podido actualizar la cola.');
}

/** Solo el conductor (RLS): quita de la cola una canción que no se puede poner (las de Spotify de antes). */
export async function markSkipped(id: string): Promise<void> {
  const { error } = await supabase
    .from('music_queue')
    .update({ status: 'saltada', ended_at: new Date().toISOString() })
    .eq('id', id)
    .eq('status', 'en_cola');
  if (error) throw toAppError(error, 'No se ha podido actualizar la cola.');
}
