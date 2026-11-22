import { IDLE_PLAYER, isPlayable, nextTrack, playerAction, resumeOffsetMs, votesNeeded, type PlayerSnapshot, type QueueItem } from '../queue';

const item = (id: string, status: string, created_at: string, track = `t-${id}`, source = 'youtube'): QueueItem => ({
  id,
  source,
  track_id: track,
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
  it('se salta las canciones de Spotify que quedaron de antes', () => {
    const items = [item('sp', 'en_cola', '2026-11-23T10:00', 'sp1', 'spotify'), item('yt', 'en_cola', '2026-11-23T10:05')];
    expect(nextTrack(items)?.id).toBe('yt');
    expect(isPlayable({ source: 'spotify' })).toBe(false);
  });
});

describe('playerAction', () => {
  const sonando = item('x', 'sonando', '2026-11-23T10:00', 'video-x');
  const player = (videoId: string | null, state: PlayerSnapshot['state']): PlayerSnapshot => ({
    videoId,
    state,
    progressMs: 10_000,
    durationMs: 200_000,
  });

  it('sin nada sonando y con cola: siguiente', () => {
    expect(playerAction({ current: null, player: IDLE_PLAYER, hasQueue: true })).toBe('play_next');
  });
  it('sin nada y sin cola: esperar', () => {
    expect(playerAction({ current: null, player: IDLE_PLAYER, hasQueue: false })).toBe('wait');
  });
  it('la canción suena o está cargando: esperar', () => {
    expect(playerAction({ current: sonando, player: player('video-x', 'playing'), hasQueue: true })).toBe('wait');
    expect(playerAction({ current: sonando, player: player('video-x', 'loading'), hasQueue: true })).toBe('wait');
    expect(playerAction({ current: sonando, player: player('video-x', 'paused'), hasQueue: true })).toBe('wait');
  });
  it('YouTube dice que ha terminado: terminar', () => {
    expect(playerAction({ current: sonando, player: player('video-x', 'ended'), hasQueue: true })).toBe('finish_current');
  });
  it('el vídeo no deja reproducirse: terminar y pasar a la siguiente', () => {
    expect(playerAction({ current: sonando, player: player('video-x', 'error'), hasQueue: false })).toBe('finish_current');
  });
  it('en el reproductor hay otra cosa (Modo conductor recién abierto): ponerla', () => {
    expect(playerAction({ current: sonando, player: IDLE_PLAYER, hasQueue: true })).toBe('load_current');
    expect(playerAction({ current: sonando, player: player('otra', 'playing'), hasQueue: true })).toBe('load_current');
  });
  it('fila saltada: siguiente', () => {
    expect(playerAction({ current: { ...sonando, status: 'saltada' }, player: player('video-x', 'playing'), hasQueue: true })).toBe(
      'play_next',
    );
  });
  it('canción de Spotify sonando: se da por terminada', () => {
    const vieja = item('sp', 'sonando', '2026-11-23T09:00', 'sp1', 'spotify');
    expect(playerAction({ current: vieja, player: IDLE_PLAYER, hasQueue: true })).toBe('finish_current');
  });
});

describe('resumeOffsetMs', () => {
  const now = new Date('2026-11-23T10:01:00Z').getTime();
  it('sigue por donde iría', () => {
    expect(resumeOffsetMs('2026-11-23T10:00:00Z', 200_000, now)).toBe(60_000);
  });
  it('desde el principio si no se sabe cuándo empezó o el reloj va raro', () => {
    expect(resumeOffsetMs(null, 200_000, now)).toBe(0);
    expect(resumeOffsetMs('2026-11-23T10:05:00Z', 200_000, now)).toBe(0);
  });
  it('null si ya habría terminado', () => {
    expect(resumeOffsetMs('2026-11-23T09:50:00Z', 200_000, now)).toBeNull();
    expect(resumeOffsetMs('2026-11-23T09:57:40Z', 200_000, now)).toBeNull();
  });
});

describe('votesNeeded', () => {
  it('más de la mitad', () => {
    expect(votesNeeded(3)).toBe(2);
    expect(votesNeeded(4)).toBe(3);
    expect(votesNeeded(1)).toBe(1);
  });
});
