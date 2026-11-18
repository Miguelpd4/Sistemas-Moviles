/** «¿Quién la ha puesto?» (#22): lectura de la ronda y reglas para empezarla y revelarla. */

/** Tiempo para responder en cada ronda (el servidor lo limita a 10–60 s). */
export const GUESS_WHO_SECONDS = 20;
/** Con menos de 3 personas no hay a quién adivinar. */
export const GUESS_WHO_MIN_PLAYERS = 3;

export type GuessWhoOption = { id: string; label: string; avatarKind?: string; avatarValue?: string };

export type GuessWhoPayload = {
  queueId: string | null;
  title: string;
  artist: string;
  albumArtUrl: string | null;
  options: GuessWhoOption[];
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const text = (value: unknown): string | undefined => (typeof value === 'string' ? value : undefined);

/** Lee el payload de la ronda tal como lo guarda `start_guess_who`, sin fiarse de su forma. */
export function readGuessWhoPayload(payload: unknown): GuessWhoPayload {
  const data = isRecord(payload) ? payload : {};
  const options = Array.isArray(data.options)
    ? data.options.flatMap((item): GuessWhoOption[] => {
        if (!isRecord(item)) return [];
        const id = text(item.id);
        const label = text(item.label);
        if (!id || !label) return [];
        return [{ id, label, avatarKind: text(item.avatarKind), avatarValue: text(item.avatarValue) }];
      })
    : [];
  return {
    queueId: text(data.queueId) ?? null,
    title: text(data.title) ?? '',
    artist: text(data.artist) ?? '',
    albumArtUrl: text(data.albumArtUrl) ?? null,
    options,
  };
}

/** La persona de la solución (`{ option: user_id }`), o null si aún no se puede ver. */
export function readSolutionOption(solution: unknown): string | null {
  return isRecord(solution) ? (text(solution.option) ?? null) : null;
}

export type GuessWhoBlocker = 'nothing_playing' | 'not_enough_players' | 'song_already_used';

/** Por qué no se puede empezar una ronda ahora, o null si se puede. */
export function guessWhoBlocker(input: {
  nowPlayingId: string | null;
  players: number;
  usedQueueIds: Iterable<string>;
}): GuessWhoBlocker | null {
  if (input.players < GUESS_WHO_MIN_PLAYERS) return 'not_enough_players';
  if (input.nowPlayingId === null) return 'nothing_playing';
  if (new Set(input.usedQueueIds).has(input.nowPlayingId)) return 'song_already_used';
  return null;
}

export const GUESS_WHO_BLOCKER_MESSAGES: Record<GuessWhoBlocker, string> = {
  nothing_playing: 'Ahora no suena ninguna canción. Espera a que empiece la siguiente.',
  not_enough_players: 'Hacen falta al menos 3 personas en el coche.',
  song_already_used: 'Ya habéis jugado con esta canción. Espera a la siguiente.',
};

/**
 * Cuántas respuestas hacen falta para revelar antes de tiempo: todos menos quien puso la
 * canción (si sigue en el coche).
 */
export function expectedAnswers(memberIds: readonly string[], adderId: string | null): number {
  return memberIds.filter((id) => id !== adderId).length;
}
