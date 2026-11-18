import { DEFAULT_CLIP_MS, readSongClip, readSongQuizPayload, resumePlan } from '../adivinaCancion';

describe('readSongQuizPayload', () => {
  it('lee las opciones y la duración del fragmento', () => {
    expect(
      readSongQuizPayload({
        options: [
          { id: 'q1', label: 'Canción 1', detail: 'Artista 1' },
          { id: 'q2', label: 'Canción 2' },
        ],
        clipSeconds: 10,
      }),
    ).toEqual({
      options: [
        { id: 'q1', label: 'Canción 1', detail: 'Artista 1' },
        { id: 'q2', label: 'Canción 2', detail: undefined },
      ],
      clipSeconds: 10,
    });
  });
  it('descarta opciones mal formadas y usa 10 s por defecto', () => {
    expect(readSongQuizPayload({ options: [{ id: 'q1' }, 7, { id: '', label: 'x' }] })).toEqual({ options: [], clipSeconds: 10 });
    expect(readSongQuizPayload(null)).toEqual({ options: [], clipSeconds: 10 });
  });
});

describe('readSongClip', () => {
  it('lee el fragmento de get_song_clip', () => {
    expect(readSongClip({ trackId: 't2', positionMs: 61234, clipMs: 10000 })).toEqual({ trackId: 't2', positionMs: 61234, clipMs: 10000 });
  });
  it('sin clipMs usa el valor por defecto', () => {
    expect(readSongClip({ trackId: 't2', positionMs: 0 })?.clipMs).toBe(DEFAULT_CLIP_MS);
  });
  it('null si falta la canción o el segundo', () => {
    expect(readSongClip({ positionMs: 1000 })).toBeNull();
    expect(readSongClip({ trackId: 't2', positionMs: -5 })).toBeNull();
    expect(readSongClip({ trackId: 't2', positionMs: 'x' })).toBeNull();
    expect(readSongClip(null)).toBeNull();
  });
});

describe('resumePlan', () => {
  it('vuelve a la canción que sonaba por donde iba', () => {
    expect(resumePlan({ trackId: 't1', progressMs: 83000, isPlaying: true })).toEqual({ kind: 'resume', trackId: 't1', positionMs: 83000 });
  });
  it('si no sonaba nada o estaba en pausa, para', () => {
    expect(resumePlan(null)).toEqual({ kind: 'pause' });
    expect(resumePlan({ trackId: null, progressMs: 0, isPlaying: false })).toEqual({ kind: 'pause' });
    expect(resumePlan({ trackId: 't1', progressMs: 5000, isPlaying: false })).toEqual({ kind: 'pause' });
  });
});
