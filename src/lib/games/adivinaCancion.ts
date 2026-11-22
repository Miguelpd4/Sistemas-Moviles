/** «Adivina la canción» (#21): lectura de la ronda y del fragmento, y cómo volver a la cola. */

/** Tiempo para responder: 10 s de fragmento más margen para pensar (el servidor lo limita a 15–60 s). */
export const SONG_QUIZ_SECONDS = 25;
/** Duración del fragmento si el servidor no dice otra cosa. */
export const DEFAULT_CLIP_MS = 10_000;
/** Tras volver a la canción de la cola, YouTube tarda un poco en cargarla y volver a sonar. */
export const RESUME_GRACE_MS = 4000;

export type SongOption = { id: string; label: string; detail?: string };
export type SongQuizPayload = { options: SongOption[]; clipSeconds: number };
export type SongClip = { trackId: string; positionMs: number; clipMs: number };

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const text = (value: unknown): string | undefined => (typeof value === 'string' && value !== '' ? value : undefined);
const count = (value: unknown): number | undefined =>
  typeof value === 'number' && Number.isFinite(value) && value >= 0 ? Math.round(value) : undefined;

/** Lee el payload de la ronda tal como lo guarda `start_song_quiz`. */
export function readSongQuizPayload(payload: unknown): SongQuizPayload {
  const data = isRecord(payload) ? payload : {};
  const options = Array.isArray(data.options)
    ? data.options.flatMap((item): SongOption[] => {
        if (!isRecord(item)) return [];
        const id = text(item.id);
        const label = text(item.label);
        return id && label ? [{ id, label, detail: text(item.detail) }] : [];
      })
    : [];
  return { options, clipSeconds: count(data.clipSeconds) ?? DEFAULT_CLIP_MS / 1000 };
}

/** Lee lo que devuelve `get_song_clip`, o null si no tiene forma. */
export function readSongClip(value: unknown): SongClip | null {
  if (!isRecord(value)) return null;
  const trackId = text(value.trackId);
  const positionMs = count(value.positionMs);
  if (!trackId || positionMs === undefined) return null;
  return { trackId, positionMs, clipMs: count(value.clipMs) || DEFAULT_CLIP_MS };
}

export type Playback = { trackId: string | null; progressMs: number; isPlaying: boolean };
export type ResumePlan = { kind: 'resume'; trackId: string; positionMs: number } | { kind: 'pause' };

/**
 * Qué hacer al acabar el fragmento: volver a la canción que sonaba por donde iba, o parar si no
 * sonaba nada (el reproductor de la cola seguirá después).
 */
export function resumePlan(before: Playback | null): ResumePlan {
  if (before === null || before.trackId === null || !before.isPlaying) return { kind: 'pause' };
  return { kind: 'resume', trackId: before.trackId, positionMs: Math.max(0, before.progressMs) };
}
