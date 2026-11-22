/** Lógica pura de la cola de música y del reproductor del conductor (S2-06, con YouTube desde #57). */

export type QueueStatus = 'en_cola' | 'sonando' | 'reproducida' | 'saltada';

export type QueueItem = {
  id: string;
  /** 'youtube' (las de ahora) o 'spotify' (las que quedaron de las pruebas con Spotify). */
  source: string;
  track_id: string;
  status: QueueStatus | string;
  created_at: string;
};

/** Estado del reproductor de YouTube del conductor. `loading`: se acaba de mandar poner un vídeo. */
export type PlayerState = 'loading' | 'unstarted' | 'ended' | 'playing' | 'paused' | 'buffering' | 'cued' | 'error';

/** Lo que la app sabe del reproductor: el vídeo que mandó poner y lo que dice YouTube. */
export type PlayerSnapshot = {
  videoId: string | null;
  state: PlayerState;
  progressMs: number;
  durationMs: number;
};

export const IDLE_PLAYER: PlayerSnapshot = { videoId: null, state: 'unstarted', progressMs: 0, durationMs: 0 };

/**
 * - play_next: poner la siguiente de la cola (o parar si no hay).
 * - finish_current: dar por terminada la que suena y poner la siguiente.
 * - load_current: la que suena según la cola no está en el reproductor (se ha vuelto a abrir el
 *   Modo conductor): ponerla por donde iría.
 */
export type PlayerAction = 'play_next' | 'finish_current' | 'load_current' | 'wait';

/** Solo se pueden poner las canciones de YouTube. */
export function isPlayable(item: Pick<QueueItem, 'source'>): boolean {
  return item.source === 'youtube';
}

/** La primera canción que se puede poner en cola, por orden de llegada, o null. */
export function nextTrack<T extends QueueItem>(items: readonly T[]): T | null {
  let best: T | null = null;
  for (const item of items) {
    if (item.status !== 'en_cola' || !isPlayable(item)) continue;
    if (best === null || item.created_at < best.created_at) best = item;
  }
  return best;
}

/**
 * Qué hacer en cada vuelta del reproductor.
 * - current: la fila que la app cree que suena (sonando o recién saltada), o null.
 * - player: lo que dice el reproductor de YouTube.
 * - hasQueue: si hay canciones que se pueden poner esperando.
 */
export function playerAction(state: { current: QueueItem | null; player: PlayerSnapshot; hasQueue: boolean }): PlayerAction {
  const { current, player, hasQueue } = state;

  if (current === null) return hasQueue ? 'play_next' : 'wait';
  if (current.status === 'saltada') return 'play_next';
  if (current.status !== 'sonando') return hasQueue ? 'play_next' : 'wait';

  if (!isPlayable(current)) return 'finish_current';
  if (player.videoId !== current.track_id) return 'load_current';
  if (player.state === 'ended' || player.state === 'error') return 'finish_current';
  return 'wait';
}

/**
 * Por dónde seguir una canción que ya sonaba al volver a abrir el Modo conductor: el tiempo
 * desde que empezó. null si ya habría terminado (se pasa a la siguiente).
 */
export function resumeOffsetMs(startedAt: string | null, durationMs: number, now: number): number | null {
  if (startedAt === null) return 0;
  const elapsed = now - new Date(startedAt).getTime();
  if (!Number.isFinite(elapsed) || elapsed < 0) return 0;
  // A menos de 5 s del final no merece la pena: siguiente canción.
  return elapsed < durationMs - 5000 ? elapsed : null;
}

/** Quién puede controlar la música desde Música (#60): el conductor y el copiloto que están dentro. */
export function canControlMusic(
  members: readonly { user_id: string; role: string; status: string }[],
  userId: string | null,
): boolean {
  if (userId === null) return false;
  const member = members.find((item) => item.user_id === userId);
  return member !== undefined && member.status === 'dentro' && (member.role === 'conductor' || member.role === 'copiloto');
}

/** Votos necesarios para saltar: más de la mitad de los que están dentro. */
export function votesNeeded(members: number): number {
  return Math.floor(Math.max(0, members) / 2) + 1;
}
