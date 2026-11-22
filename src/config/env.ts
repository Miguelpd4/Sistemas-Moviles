/**
 * Variables públicas de .env. Expo solo las sustituye si se leen así, una a una
 * (process.env.EXPO_PUBLIC_X), nunca con process.env[nombre].
 */
const values = {
  EXPO_PUBLIC_SUPABASE_URL: process.env.EXPO_PUBLIC_SUPABASE_URL,
  EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY: process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
  EXPO_PUBLIC_WEB_URL: process.env.EXPO_PUBLIC_WEB_URL,
};

type EnvName = keyof typeof values;

function required(name: EnvName): string {
  const value = values[name]?.trim();
  if (!value) {
    throw new Error(`Falta la variable ${name} en .env. Copia .env.example a .env y reinicia Expo.`);
  }
  return value;
}

export const env = {
  supabaseUrl: required('EXPO_PUBLIC_SUPABASE_URL'),
  supabaseKey: required('EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY'),
  /** https://<dominio de Vercel>, sin barra final. */
  webUrl: required('EXPO_PUBLIC_WEB_URL').replace(/\/+$/, ''),
};
