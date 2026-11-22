import { makeRedirectUri } from 'expo-auth-session';

import { AppError } from '@/lib/errors';

/** Leer YouTube en nombre del conductor (buscar canciones). No permite publicar ni borrar nada. */
export const YOUTUBE_SCOPE = 'https://www.googleapis.com/auth/youtube.readonly';

export const GOOGLE_DISCOVERY = {
  authorizationEndpoint: 'https://accounts.google.com/o/oauth2/v2/auth',
};

/** Solo en la web: https://<dominio>/youtube-auth (hay que darla de alta en el cliente web de Google Cloud). */
export const youtubeRedirectUri = () => makeRedirectUri({ scheme: 'copi', path: 'youtube-auth' });

export const NOT_CONNECTED = 'YOUTUBE_NOT_CONNECTED';

export const notConnected = (message = 'Conecta tu cuenta de Google para usar YouTube.') =>
  new AppError(message, { code: NOT_CONNECTED });

export const missingClientId = () =>
  new AppError('Falta EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID en .env (y en las variables de Vercel para la web).', {
    code: 'YOUTUBE_CONFIG',
  });

/** Lo que devuelve el inicio de sesión del conductor, igual en Android y en la web. */
export type YouTubeLogin = {
  /** Hay Client ID y se puede pulsar «Conectar YouTube». */
  ready: boolean;
  connected: boolean;
  /** Email de la cuenta (en Android) o null si no se sabe. */
  account: string | null;
  busy: boolean;
  error: string | null;
  login: () => void;
  logout: () => Promise<void>;
};
