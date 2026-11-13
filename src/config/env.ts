/**
 * Variables públicas de .env. Expo solo las sustituye si se leen así, una a una
 * (process.env.EXPO_PUBLIC_X), nunca con process.env[nombre].
 */
const values = {
  EXPO_PUBLIC_SUPABASE_URL: process.env.EXPO_PUBLIC_SUPABASE_URL,
  EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY: process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
  EXPO_PUBLIC_WEB_URL: process.env.EXPO_PUBLIC_WEB_URL,
  EXPO_PUBLIC_SPOTIFY_CLIENT_ID: process.env.EXPO_PUBLIC_SPOTIFY_CLIENT_ID,
};

type EnvName = keyof typeof values;

function required(name: EnvName): string {
  const value = values[name]?.trim();
  if (!value) {
    throw new Error(`Falta la variable ${name} en .env. Copia .env.example a .env, rellénala y reinicia Expo.`);
  }
  return value;
}

function optional(name: EnvName): string | null {
  return values[name]?.trim() || null;
}

export const env = {
  supabaseUrl: required('EXPO_PUBLIC_SUPABASE_URL'),
  supabaseKey: required('EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY'),
  /** https://<dominio de Vercel>, sin barra final. */
  webUrl: required('EXPO_PUBLIC_WEB_URL').replace(/\/+$/, ''),
  /** Solo hace falta para la prueba de Spotify (S1-09). */
  spotifyClientId: optional('EXPO_PUBLIC_SPOTIFY_CLIENT_ID'),
};
