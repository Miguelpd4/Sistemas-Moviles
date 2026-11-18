/** Lógica pura de la cola de música y del reproductor del conductor (S2-06). */

export type QueueStatus = 'en_cola' | 'sonando' | 'reproducida' | 'saltada';

export type QueueItem = {
  id: string;
  spotify_track_id: string;
  status: QueueStatus | string;
  created_at: string;
};

export type SpotifySnapshot = {
  trackId: string | null;
  progressMs: number;
  durationMs: number;
  isPlaying: boolean;
};

export type PlayerAction = 'play_next' | 'finish_current' | 'wait';

/** Margen para dar por acabada una canción. */
export const END_MARGIN_MS = 1500;

/** La primera canción en cola por orden de llegada, o null. */
export function nextTrack<T extends QueueItem>(items: readonly T[]): T | null {
  let best: T | null = null;
  for (const item of items) {
    if (item.status !== 'en_cola') continue;
    if (best === null || item.created_at < best.created_at) best = item;
  }
  return best;
}

/**
 * Qué hacer en cada vuelta del reproductor.
 * - current: la fila que la app cree que suena (sonando o recién saltada), o null.
 * - spotify: lo que dice Spotify, o null si no suena nada.
 * - hasQueue: si hay canciones esperando.
 */
export function playerAction(state: {
  current: QueueItem | null;
  spotify: SpotifySnapshot | null;
  hasQueue: boolean;
}): PlayerAction {
  const { current, spotify, hasQueue } = state;

  if (current === null) return hasQueue ? 'play_next' : 'wait';
  if (current.status === 'saltada') return 'play_next';
  if (current.status !== 'sonando') return hasQueue ? 'play_next' : 'wait';

  if (spotify === null || spotify.trackId === null) return 'finish_current';
  if (spotify.trackId !== current.spotify_track_id) return 'finish_current';
  if (spotify.durationMs > 0 && spotify.durationMs - spotify.progressMs < END_MARGIN_MS) return 'finish_current';
  // Spotify parado al principio de la canción: ha llegado al final y ha vuelto a 0.
  if (!spotify.isPlaying && spotify.progressMs === 0) return 'finish_current';
  return 'wait';
}

/** Votos necesarios para saltar: más de la mitad de los que están dentro. */
export function votesNeeded(members: number): number {
  return Math.floor(Math.max(0, members) / 2) + 1;
}
