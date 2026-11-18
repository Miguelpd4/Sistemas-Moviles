import { nextTrack, playerAction, votesNeeded, type QueueItem } from '../queue';

const item = (id: string, status: string, created_at: string, track = `t-${id}`): QueueItem => ({
  id,
  spotify_track_id: track,
  status,
  created_at,
});

describe('nextTrack', () => {
  it('devuelve null con la cola vacía', () => {
    expect(nextTrack([])).toBeNull();
  });
  it('devuelve la primera en cola por orden de llegada', () => {
    const items = [item('b', 'en_cola', '2026-11-23T10:02'), item('a', 'en_cola', '2026-11-23T10:01'), item('c', 'sonando', '2026-11-23T10:00')];
    expect(nextTrack(items)?.id).toBe('a');
  });
});

describe('playerAction', () => {
  const sonando = item('x', 'sonando', '2026-11-23T10:00', 'track-x');
  const spotify = (trackId: string | null, progressMs: number, durationMs = 200_000, isPlaying = true) => ({
    trackId,
    progressMs,
    durationMs,
    isPlaying,
  });

  it('sin nada sonando y con cola: siguiente', () => {
    expect(playerAction({ current: null, spotify: null, hasQueue: true })).toBe('play_next');
  });
  it('sin nada y sin cola: esperar', () => {
    expect(playerAction({ current: null, spotify: null, hasQueue: false })).toBe('wait');
  });
  it('canción a mitad: esperar', () => {
    expect(playerAction({ current: sonando, spotify: spotify('track-x', 100_000), hasQueue: true })).toBe('wait');
  });
  it('canción a 1 s del final: terminar', () => {
    expect(playerAction({ current: sonando, spotify: spotify('track-x', 199_000), hasQueue: true })).toBe('finish_current');
  });
  it('Spotify con otra canción: terminar', () => {
    expect(playerAction({ current: sonando, spotify: spotify('otra', 5_000), hasQueue: false })).toBe('finish_current');
  });
  it('fila saltada: siguiente', () => {
    expect(playerAction({ current: { ...sonando, status: 'saltada' }, spotify: spotify('track-x', 5_000), hasQueue: true })).toBe(
      'play_next',
    );
  });
  it('Spotify parado al volver a 0: terminar', () => {
    expect(playerAction({ current: sonando, spotify: spotify('track-x', 0, 200_000, false), hasQueue: true })).toBe(
      'finish_current',
    );
  });
});

describe('votesNeeded', () => {
  it('más de la mitad', () => {
    expect(votesNeeded(3)).toBe(2);
    expect(votesNeeded(4)).toBe(3);
    expect(votesNeeded(1)).toBe(1);
  });
});
