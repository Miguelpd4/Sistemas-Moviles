import { makeRedirectUri } from 'expo-auth-session';

export const SPOTIFY_DISCOVERY = {
  authorizationEndpoint: 'https://accounts.spotify.com/authorize',
  tokenEndpoint: 'https://accounts.spotify.com/api/token',
};

/** Permisos para controlar la reproducción en el móvil del conductor. */
export const SPOTIFY_SCOPES = ['user-read-playback-state', 'user-modify-playback-state', 'user-read-currently-playing'];

/** copi://spotify-auth (hay que darlo de alta tal cual en el panel de Spotify for Developers). */
export const spotifyRedirectUri = () => makeRedirectUri({ scheme: 'copi', path: 'spotify-auth' });
