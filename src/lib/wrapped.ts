/**
 * COPI Wrapped (#35): la banda sonora de un viaje a partir de su cola de música (music_queue).
 *
 * - Una reproducción es una canción que sonó hasta el final: estado 'reproducida' y con
 *   `started_at` (end_trip también da por reproducida la que sonaba al terminar). Las que solo se
 *   añadieron ('en_cola') no cuentan; las saltadas ('saltada') se cuentan aparte.
 * - Una misma canción (mismo `track_id`) puede sonar varias veces: cada vez es una reproducción.
 * - Los minutos salen de `ended_at - started_at` de lo que sonó (también lo saltado), sin pasar
 *   nunca de la duración de la canción. Las pausas no se guardan, así que es una estimación.
 * - El DJ del viaje es quien añadió más canciones de las que llegaron a sonar enteras.
 */

export type MusicEntry = {
  session_id: string;
  track_id: string;
  title: string;
  artist: string;
  album_art_url: string | null;
  duration_ms: number;
  added_by: string;
  status: string;
  started_at: string | null;
  ended_at: string | null;
};

export type WrappedTrack = { trackId: string; title: string; artist: string; albumArtUrl: string | null; plays: number; listenedMs: number };

export type Wrapped = {
  /** Canciones que sonaron enteras (con repeticiones). */
  plays: number;
  /** Las que empezaron a sonar y se saltaron. */
  skipped: number;
  /** Canciones distintas que sonaron. */
  uniqueTracks: number;
  artists: number;
  /** Tiempo escuchado estimado (incluye lo que sonó de las saltadas). */
  listenedMs: number;
  /** Top 5 por reproducciones. */
  topTracks: WrappedTrack[];
  topArtist: { name: string; plays: number; tracks: number; albumArtUrl: string | null } | null;
  /** Quien añadió más canciones de las que sonaron (varios si hay empate). */
  dj: { userIds: string[]; songs: number } | null;
};

const TOP = 5;

/** Lo que sonó de verdad de una entrada, en ms, sin pasar de la duración de la canción. */
export function listenedMs(entry: Pick<MusicEntry, 'started_at' | 'ended_at' | 'duration_ms'>): number {
  if (!entry.started_at || !entry.ended_at) return 0;
  const ms = new Date(entry.ended_at).getTime() - new Date(entry.started_at).getTime();
  if (!Number.isFinite(ms) || ms <= 0) return 0;
  return Math.min(ms, Math.max(0, entry.duration_ms));
}

const trackKey = (entry: MusicEntry) => entry.track_id || `${entry.title}|${entry.artist}`;
const artistKey = (name: string) => name.trim().toLocaleLowerCase('es');

/** Los más repetidos de un recuento (todos si empatan). */
function leaders(counts: ReadonlyMap<string, number>): { keys: string[]; count: number } | null {
  let best = 0;
  for (const count of counts.values()) best = Math.max(best, count);
  if (best === 0) return null;
  return { keys: [...counts].filter(([, count]) => count === best).map(([key]) => key), count: best };
}

export function buildWrapped(entries: readonly MusicEntry[], sessionId: string): Wrapped {
  // Solo el viaje pedido, aunque lleguen filas de otros.
  const mine = entries.filter((entry) => entry.session_id === sessionId);
  const sounded = mine.filter((entry) => entry.started_at !== null && (entry.status === 'reproducida' || entry.status === 'saltada'));
  const played = sounded.filter((entry) => entry.status === 'reproducida');

  const tracks = new Map<string, WrappedTrack & { firstAt: number }>();
  for (const entry of played) {
    const key = trackKey(entry);
    const current = tracks.get(key);
    const at = new Date(entry.started_at ?? 0).getTime();
    if (current) {
      current.plays += 1;
      current.listenedMs += listenedMs(entry);
      current.firstAt = Math.min(current.firstAt, at);
      current.albumArtUrl ??= entry.album_art_url;
    } else {
      tracks.set(key, {
        trackId: key,
        title: entry.title,
        artist: entry.artist.trim(),
        albumArtUrl: entry.album_art_url,
        plays: 1,
        listenedMs: listenedMs(entry),
        firstAt: at,
      });
    }
  }
  const ranked = [...tracks.values()].sort((a, b) => b.plays - a.plays || b.listenedMs - a.listenedMs || a.firstAt - b.firstAt);

  const artists = new Map<string, { name: string; plays: number; tracks: Set<string>; albumArtUrl: string | null; firstAt: number }>();
  for (const track of ranked) {
    const key = artistKey(track.artist);
    if (key === '') continue;
    const current = artists.get(key);
    if (current) {
      current.plays += track.plays;
      current.tracks.add(track.trackId);
    } else {
      artists.set(key, { name: track.artist, plays: track.plays, tracks: new Set([track.trackId]), albumArtUrl: track.albumArtUrl, firstAt: track.firstAt });
    }
  }
  const artist = [...artists.values()].sort((a, b) => b.plays - a.plays || b.tracks.size - a.tracks.size || a.firstAt - b.firstAt)[0];

  const byAdder = new Map<string, number>();
  for (const entry of played) byAdder.set(entry.added_by, (byAdder.get(entry.added_by) ?? 0) + 1);
  const dj = leaders(byAdder);

  return {
    plays: played.length,
    skipped: sounded.length - played.length,
    uniqueTracks: tracks.size,
    artists: artists.size,
    listenedMs: sounded.reduce((sum, entry) => sum + listenedMs(entry), 0),
    topTracks: ranked.slice(0, TOP).map(({ firstAt: _firstAt, ...track }) => track),
    topArtist: artist ? { name: artist.name, plays: artist.plays, tracks: artist.tracks.size, albumArtUrl: artist.albumArtUrl } : null,
    dj: dj ? { userIds: dj.keys, songs: dj.count } : null,
  };
}

/** Minutos escuchados (redondeados, al menos 1), o null si no hay datos para estimarlo. */
export function listenedMinutes(ms: number): number | null {
  return ms > 0 ? Math.max(1, Math.round(ms / 60_000)) : null;
}

/** «≈ 42 min» o «≈ 1 h 05 min»; null si no hay datos para estimarlo. */
export function listenedLabel(ms: number): string | null {
  if (ms <= 0) return null;
  const minutes = Math.max(1, Math.round(ms / 60_000));
  if (minutes < 60) return `≈ ${minutes} min`;
  return `≈ ${Math.floor(minutes / 60)} h ${String(minutes % 60).padStart(2, '0')} min`;
}
