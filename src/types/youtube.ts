/** Canción de YouTube tal como la usa COPI (búsqueda, cola y reproductor). */
export type YouTubeTrack = {
  videoId: string;
  title: string;
  /** Canal; en el audio oficial, «Artista - Topic» ya limpio («Artista»). */
  artist: string;
  thumbnailUrl: string | null;
  durationMs: number;
  /** Audio oficial (canal «- Topic» de YouTube Music) en vez de un videoclip o un vídeo de un usuario. */
  official: boolean;
};

/** Mensajes del reproductor de YouTube (API IFrame) a la app. */
export type YouTubePlayerEvent =
  | { type: 'ready' }
  | { type: 'state'; state: 'unstarted' | 'ended' | 'playing' | 'paused' | 'buffering' | 'cued' }
  | { type: 'progress'; currentMs: number; durationMs: number }
  | { type: 'error'; code: number };

/** Órdenes de la app al reproductor. */
export type YouTubePlayerCommand =
  | { type: 'load'; videoId: string; startSeconds: number }
  | { type: 'play' }
  | { type: 'pause' }
  | { type: 'seek'; seconds: number };
