/** Canción tal como la devuelve la Edge Function spotify-search. */
export type SpotifyTrack = {
  id: string;
  title: string;
  artist: string;
  albumArtUrl: string | null;
  durationMs: number;
};

export type SpotifyTokens = {
  accessToken: string;
  refreshToken: string;
  /** Milisegundos desde 1970 en que caduca el accessToken. */
  expiresAt: number;
};

export type SpotifyDevice = {
  id: string | null;
  name: string;
  type: string;
  is_active: boolean;
};

export type PlaybackState = {
  trackId: string | null;
  title: string | null;
  progressMs: number;
  durationMs: number;
  isPlaying: boolean;
};
