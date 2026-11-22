import {
  cleanChannel,
  decodeEntities,
  parseIsoDuration,
  parsePlayerEvent,
  playerErrorMessage,
  playerStateName,
  toMusicTracks,
  type RawYouTubeVideo,
} from '../youtube';

describe('parseIsoDuration', () => {
  it.each([
    ['PT3M6S', 186_000],
    ['PT4M18S', 258_000],
    ['PT45S', 45_000],
    ['PT1H2M3S', 3_723_000],
    ['PT2H', 7_200_000],
    ['P1DT1S', 86_401_000],
    ['PT1.5S', 1_500],
  ])('%s → %i ms', (iso, ms) => {
    expect(parseIsoDuration(iso)).toBe(ms);
  });

  it('da 0 con directos, vacíos o texto que no entiende', () => {
    expect(parseIsoDuration('P0D')).toBe(0);
    expect(parseIsoDuration('')).toBe(0);
    expect(parseIsoDuration(null)).toBe(0);
    expect(parseIsoDuration('3:06')).toBe(0);
  });
});

describe('cleanChannel y decodeEntities', () => {
  it('quita « - Topic» del canal de audio oficial', () => {
    expect(cleanChannel('Quevedo - Topic')).toBe('Quevedo');
    expect(cleanChannel('QuevedoVEVO')).toBe('QuevedoVEVO');
  });

  it('traduce las entidades HTML de los títulos', () => {
    expect(decodeEntities('Tom &amp; Jerry')).toBe('Tom & Jerry');
    expect(decodeEntities('It&#39;s &quot;OK&quot;')).toBe('It\'s "OK"');
    expect(decodeEntities('&lt;3 &#x41;')).toBe('<3 A');
  });
});

describe('toMusicTracks', () => {
  const video = (over: Partial<RawYouTubeVideo>): RawYouTubeVideo => ({
    id: 'id',
    title: 'Columbia',
    channelTitle: 'Quevedo',
    thumbnailUrl: 'https://i.ytimg.com/x.jpg',
    duration: 'PT3M6S',
    embeddable: true,
    blocked: false,
    ...over,
  });

  it('pone primero el audio oficial y respeta el orden dentro de cada grupo', () => {
    const tracks = toMusicTracks([
      video({ id: 'clip', channelTitle: 'QuevedoVEVO' }),
      video({ id: 'topic1', channelTitle: 'Quevedo - Topic' }),
      video({ id: 'fan', channelTitle: 'Letras Pro' }),
      video({ id: 'topic2', channelTitle: 'Elvis Crespo - Topic', title: 'LA GRACIOSA' }),
    ]);
    expect(tracks.map((track) => track.videoId)).toEqual(['topic1', 'topic2', 'clip', 'fan']);
    expect(tracks[0]).toMatchObject({ artist: 'Quevedo', official: true, durationMs: 186_000 });
    expect(tracks[2]).toMatchObject({ artist: 'QuevedoVEVO', official: false });
  });

  it('quita lo que no se puede reproducir dentro de la app', () => {
    const tracks = toMusicTracks([
      video({ id: 'ok' }),
      video({ id: 'no-incrustable', embeddable: false }),
      video({ id: 'restringido', blocked: true }),
      video({ id: 'directo', duration: 'P0D' }),
      video({ id: 'recopilatorio', duration: 'PT2H10M' }),
    ]);
    expect(tracks.map((track) => track.videoId)).toEqual(['ok']);
  });
});

describe('mensajes del reproductor', () => {
  it('lee los mensajes válidos y descarta el resto', () => {
    expect(parsePlayerEvent('{"type":"ready"}')).toEqual({ type: 'ready' });
    expect(parsePlayerEvent('{"type":"state","code":1}')).toEqual({ type: 'state', state: 'playing' });
    expect(parsePlayerEvent('{"type":"state","code":0}')).toEqual({ type: 'state', state: 'ended' });
    expect(parsePlayerEvent('{"type":"progress","currentMs":1000,"durationMs":186000}')).toEqual({
      type: 'progress',
      currentMs: 1000,
      durationMs: 186000,
    });
    expect(parsePlayerEvent('{"type":"error","code":150}')).toEqual({ type: 'error', code: 150 });
    expect(parsePlayerEvent('{"type":"progress","currentMs":"x"}')).toBeNull();
    expect(parsePlayerEvent('{"type":"otro"}')).toBeNull();
    expect(parsePlayerEvent('no es json')).toBeNull();
    expect(parsePlayerEvent(42)).toBeNull();
  });

  it('traduce los estados y los errores de YouTube', () => {
    expect(playerStateName(2)).toBe('paused');
    expect(playerStateName(99)).toBe('unstarted');
    expect(playerErrorMessage(150)).toMatch(/no deja ponerlo fuera de YouTube/);
    expect(playerErrorMessage(153)).toMatch(/error 153/);
    expect(playerErrorMessage(7)).toMatch(/\(7\)/);
  });
});
