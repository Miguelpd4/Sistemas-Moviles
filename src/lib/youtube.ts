import type { YouTubePlayerEvent, YouTubeTrack } from '@/types/youtube';

type PlayerState = Extract<YouTubePlayerEvent, { type: 'state' }>['state'];

/**
 * Duración ISO 8601 de la API de YouTube («PT3M6S», «PT1H2M», «P1DT2H») en milisegundos.
 * Devuelve 0 si no se entiende (por ejemplo «P0D» en un directo).
 */
export function parseIsoDuration(iso: string | null | undefined): number {
  if (!iso) return 0;
  const match = /^P(?:(\d+)D)?(?:T(?:(\d+)H)?(?:(\d+)M)?(?:(\d+(?:\.\d+)?)S)?)?$/.exec(iso.trim());
  if (!match) return 0;
  const [, days, hours, minutes, seconds] = match;
  const total =
    Number(days ?? 0) * 86_400 + Number(hours ?? 0) * 3_600 + Number(minutes ?? 0) * 60 + Number(seconds ?? 0);
  return Math.round(total * 1000);
}

const TOPIC_SUFFIX = / - Topic$/;

/** «Quevedo - Topic» → «Quevedo» (los canales de audio oficial de YouTube Music). */
export function cleanChannel(channel: string): string {
  return channel.replace(TOPIC_SUFFIX, '').trim();
}

/** La API devuelve los títulos con entidades HTML («Tom &amp; Jerry», «It&#39;s»). */
export function decodeEntities(text: string): string {
  return text
    .replace(/&#(\d+);/g, (_, code: string) => String.fromCharCode(Number(code)))
    .replace(/&#x([0-9a-f]+);/gi, (_, code: string) => String.fromCharCode(parseInt(code, 16)))
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&');
}

/** Lo que interesa de un resultado de `search.list` + `videos.list` (contentDetails, status). */
export type RawYouTubeVideo = {
  id: string;
  title: string;
  channelTitle: string;
  thumbnailUrl: string | null;
  duration: string | null;
  embeddable: boolean;
  /** Restringido por edad o privado: no se puede reproducir fuera de YouTube. */
  blocked: boolean;
};

/** Canciones más largas que esto no son canciones (recopilatorios de horas, directos). */
const MAX_SONG_MS = 15 * 60_000;

/**
 * De los resultados de la API a canciones de COPI: quita lo que no se puede reproducir dentro de la
 * app (no incrustable, restringido, directos o recopilatorios) y pone primero el audio oficial
 * («- Topic»), manteniendo el orden de relevancia de YouTube dentro de cada grupo.
 */
export function toMusicTracks(videos: readonly RawYouTubeVideo[]): YouTubeTrack[] {
  const tracks = videos
    .filter((video) => video.embeddable && !video.blocked)
    .map<YouTubeTrack>((video) => ({
      videoId: video.id,
      title: decodeEntities(video.title),
      artist: cleanChannel(decodeEntities(video.channelTitle)),
      thumbnailUrl: video.thumbnailUrl,
      durationMs: parseIsoDuration(video.duration),
      official: TOPIC_SUFFIX.test(video.channelTitle),
    }))
    .filter((track) => track.durationMs > 0 && track.durationMs <= MAX_SONG_MS);
  return [...tracks.filter((track) => track.official), ...tracks.filter((track) => !track.official)];
}

/** Mensaje para el conductor según el código de error del reproductor de YouTube (API IFrame). */
export function playerErrorMessage(code: number): string {
  switch (code) {
    case 2:
      return 'Ese vídeo de YouTube no es válido.';
    case 5:
      return 'El reproductor no ha podido poner este vídeo. Prueba con otra canción.';
    case 100:
      return 'Ese vídeo ya no existe o es privado.';
    case 101:
    case 150:
      return 'El dueño de este vídeo no deja ponerlo fuera de YouTube. Elige otra versión de la canción.';
    case 153:
      return 'YouTube no reconoce desde dónde se reproduce (error 153). Avisad: hay que revisar el origen del reproductor.';
    default:
      return `El reproductor de YouTube ha dado un error (${code}).`;
  }
}

const STATES: Readonly<Record<string, PlayerState>> = {
  '-1': 'unstarted',
  '0': 'ended',
  '1': 'playing',
  '2': 'paused',
  '3': 'buffering',
  '5': 'cued',
};

/** Estado numérico de la API IFrame (YT.PlayerState) al nombre que usa la app. */
export function playerStateName(code: number): PlayerState {
  return STATES[String(code)] ?? 'unstarted';
}

/** Lee un mensaje del reproductor (texto JSON). Devuelve null si no es un mensaje válido. */
export function parsePlayerEvent(data: unknown): YouTubePlayerEvent | null {
  if (typeof data !== 'string' || !data.startsWith('{')) return null;
  try {
    const value = JSON.parse(data) as Record<string, unknown>;
    switch (value.type) {
      case 'ready':
        return { type: 'ready' };
      case 'state':
        return typeof value.code === 'number' ? { type: 'state', state: playerStateName(value.code) } : null;
      case 'progress':
        return typeof value.currentMs === 'number' && typeof value.durationMs === 'number'
          ? { type: 'progress', currentMs: value.currentMs, durationMs: value.durationMs }
          : null;
      case 'error':
        return typeof value.code === 'number' ? { type: 'error', code: value.code } : null;
      default:
        return null;
    }
  } catch {
    return null;
  }
}
