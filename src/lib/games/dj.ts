/**
 * Turnos de DJ (#20): fase de la ronda y a quién le toca. Es la misma regla que las funciones
 * `dj_current_turn` y `dj_phase` de la base de datos, que son las que mandan.
 */

export type DjTurn = { id: string; label: string; avatarKind?: string; avatarValue?: string };
export type DjPayload = { turns: DjTurn[]; skipped: string[] };
export type DjSong = { id: string; added_by: string; status: string; title: string; artist: string };

/** eligiendo: falta alguien por elegir · escuchando: quedan canciones por sonar · votando · vacia: nadie eligió. */
export type DjPhase = 'eligiendo' | 'escuchando' | 'votando' | 'vacia';

export type DjState = {
  phase: DjPhase;
  /** A quién le toca elegir (solo en «eligiendo»). */
  currentTurn: DjTurn | null;
  /** Canciones de la ronda que ya han sonado (o se han saltado). */
  played: number;
  total: number;
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);
const text = (value: unknown): string | undefined => (typeof value === 'string' && value !== '' ? value : undefined);

/** Lee el payload de la ronda tal como lo guardan `start_dj_round` y `skip_dj_turn`. */
export function readDjPayload(payload: unknown): DjPayload {
  const data = isRecord(payload) ? payload : {};
  const turns = Array.isArray(data.turns)
    ? data.turns.flatMap((item): DjTurn[] => {
        if (!isRecord(item)) return [];
        const id = text(item.id);
        const label = text(item.label);
        return id && label ? [{ id, label, avatarKind: text(item.avatarKind), avatarValue: text(item.avatarValue) }] : [];
      })
    : [];
  const skipped = Array.isArray(data.skipped) ? data.skipped.filter((id): id is string => typeof id === 'string') : [];
  return { turns, skipped };
}

const PENDING = new Set(['en_cola', 'sonando']);

export function djState(input: {
  payload: DjPayload;
  /** Quién sigue dentro del coche. */
  insideIds: ReadonlySet<string>;
  /** Canciones de la ronda (cualquier estado). */
  songs: readonly DjSong[];
}): DjState {
  const { payload, insideIds, songs } = input;
  const skipped = new Set(payload.skipped);
  const chose = new Set(songs.map((song) => song.added_by));
  const currentTurn =
    payload.turns.find((turn) => insideIds.has(turn.id) && !skipped.has(turn.id) && !chose.has(turn.id)) ?? null;
  const played = songs.filter((song) => !PENDING.has(song.status)).length;
  let phase: DjPhase;
  if (currentTurn !== null) phase = 'eligiendo';
  else if (songs.length === 0) phase = 'vacia';
  else if (played < songs.length) phase = 'escuchando';
  else phase = 'votando';
  return { phase, currentTurn: phase === 'eligiendo' ? currentTurn : null, played, total: songs.length };
}

/** Estado de cada turno para pintar la lista: ya ha elegido, le toca, se saltó, se fue o espera. */
export type TurnStatus = 'eligio' | 'le_toca' | 'saltado' | 'fuera' | 'espera';

export function turnStatus(turn: DjTurn, state: DjState, payload: DjPayload, insideIds: ReadonlySet<string>, songs: readonly DjSong[]): TurnStatus {
  if (songs.some((song) => song.added_by === turn.id)) return 'eligio';
  if (state.currentTurn?.id === turn.id) return 'le_toca';
  if (payload.skipped.includes(turn.id)) return 'saltado';
  if (!insideIds.has(turn.id)) return 'fuera';
  return 'espera';
}

/** Las canciones que puedo votar: todas las de la ronda menos la mía. */
export function voteOptions(songs: readonly DjSong[], myId: string | null): { id: string; label: string; detail: string }[] {
  return songs.filter((song) => song.added_by !== myId).map((song) => ({ id: song.id, label: song.title, detail: song.artist }));
}
