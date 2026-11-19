import { AppError } from '@/lib/errors';

import { createTokenStore } from './tokenStore';

const KEY = 'copi.spotify.tokens';

/** localStorage puede no existir o estar bloqueado (modo privado, cookies desactivadas). */
function storage(): Storage | null {
  try {
    return typeof window !== 'undefined' ? window.localStorage : null;
  } catch {
    return null;
  }
}

/**
 * Tokens de Spotify del conductor en la web (Modo conductor desde el navegador, para pruebas).
 * Van en localStorage: menos protegidos que en el móvil, por eso solo se guarda esto y se borran
 * al desconectar o si la renovación falla.
 */
export const { saveTokens, loadTokens, clearTokens, getValidAccessToken, refreshTokens, expireTokensForTesting } = createTokenStore({
  read: async () => storage()?.getItem(KEY) ?? null,
  write: async (value) => {
    const store = storage();
    if (!store) throw new AppError('Este navegador no deja guardar datos: no se puede conectar Spotify.');
    store.setItem(KEY, value);
  },
  remove: async () => {
    storage()?.removeItem(KEY);
  },
});
