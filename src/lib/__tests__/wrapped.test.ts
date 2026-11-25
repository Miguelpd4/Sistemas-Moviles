import { buildWrapped, listenedLabel, listenedMinutes, listenedMs, type MusicEntry } from '../wrapped';

let n = 0;
const at = (minute: number) => new Date(Date.UTC(2026, 10, 22, 10, minute)).toISOString();

function entry(over: Partial<MusicEntry> & Pick<MusicEntry, 'track_id'>): MusicEntry {
  n += 1;
  return {
    session_id: 's1',
    title: `Canción ${over.track_id}`,
    artist: 'Quevedo',
    album_art_url: `https://img/${over.track_id}.jpg`,
    duration_ms: 180_000,
    added_by: 'ana',
    status: 'reproducida',
    started_at: at(n * 4),
    ended_at: at(n * 4 + 3),
    ...over,
  };
}

describe('listenedMs', () => {
  it('lo que sonó, sin pasar de la duración de la canción', () => {
    expect(listenedMs({ started_at: at(0), ended_at: at(2), duration_ms: 180_000 })).toBe(120_000);
    expect(listenedMs({ started_at: at(0), ended_at: at(10), duration_ms: 180_000 })).toBe(180_000);
    expect(listenedMs({ started_at: null, ended_at: null, duration_ms: 180_000 })).toBe(0);
    expect(listenedMs({ started_at: at(5), ended_at: at(1), duration_ms: 180_000 })).toBe(0);
  });
});

describe('buildWrapped', () => {
  const entries: MusicEntry[] = [
    entry({ track_id: 'a', title: 'Columbia', added_by: 'bea' }),
    entry({ track_id: 'a', title: 'Columbia', added_by: 'carlos' }),
    entry({ track_id: 'a', title: 'Columbia', added_by: 'bea' }),
    entry({ track_id: 'b', title: 'Despechá', artist: 'Rosalía', added_by: 'bea' }),
    entry({ track_id: 'c', title: 'Playa del Inglés', artist: 'Quevedo ', added_by: 'carlos' }),
    // Saltada: cuenta el rato que sonó, pero no como reproducción
    entry({ track_id: 'd', title: 'Saltada', artist: 'Otro', status: 'saltada', started_at: at(60), ended_at: at(61), added_by: 'dani' }),
    // Solo añadida a la cola: no cuenta para nada
    entry({ track_id: 'e', title: 'En cola', status: 'en_cola', started_at: null, ended_at: null, added_by: 'dani' }),
    // De otro viaje: no se mezcla
    entry({ track_id: 'a', session_id: 's2', added_by: 'dani' }),
  ];
  const wrapped = buildWrapped(entries, 's1');

  it('cuenta solo lo que sonó entero en este viaje', () => {
    expect(wrapped.plays).toBe(5);
    expect(wrapped.skipped).toBe(1);
    expect(wrapped.uniqueTracks).toBe(3);
    expect(wrapped.artists).toBe(2);
  });

  it('minutos: lo escuchado de lo que sonó (también lo saltado)', () => {
    expect(wrapped.listenedMs).toBe(5 * 180_000 + 60_000);
    expect(listenedLabel(wrapped.listenedMs)).toBe('≈ 16 min');
    expect(listenedMinutes(wrapped.listenedMs)).toBe(16);
    expect(listenedLabel(95 * 60_000)).toBe('≈ 1 h 35 min');
  });

  it('la canción número uno y el top agrupan por canción', () => {
    expect(wrapped.topTracks.map((t) => [t.title, t.plays])).toEqual([
      ['Columbia', 3],
      ['Despechá', 1],
      ['Playa del Inglés', 1],
    ]);
    expect(wrapped.topTracks[0]?.albumArtUrl).toBe('https://img/a.jpg');
  });

  it('artista favorito por reproducciones (juntando espacios sobrantes)', () => {
    expect(wrapped.topArtist).toEqual({ name: 'Quevedo', plays: 4, tracks: 2, albumArtUrl: 'https://img/a.jpg' });
  });

  it('el DJ es quien añadió más canciones que sonaron, no las que solo añadió', () => {
    expect(wrapped.dj).toEqual({ userIds: ['bea'], songs: 3 });
  });

  it('empate de DJ y top limitado a 5', () => {
    const many = ['a', 'b', 'c', 'd', 'e', 'f', 'g'].map((id, i) => entry({ track_id: id, added_by: i % 2 ? 'x' : 'y' }));
    const w = buildWrapped([...many, entry({ track_id: 'h', added_by: 'x' })], 's1');
    expect(w.topTracks).toHaveLength(5);
    expect(w.dj?.userIds.sort()).toEqual(['x', 'y']);
  });

  it('un viaje sin música no inventa nada', () => {
    expect(buildWrapped([entry({ track_id: 'z', status: 'en_cola', started_at: null, ended_at: null })], 's1')).toEqual({
      plays: 0,
      skipped: 0,
      uniqueTracks: 0,
      artists: 0,
      listenedMs: 0,
      topTracks: [],
      topArtist: null,
      dj: null,
    });
    expect(listenedLabel(0)).toBeNull();
    expect(listenedMinutes(0)).toBeNull();
  });
});
