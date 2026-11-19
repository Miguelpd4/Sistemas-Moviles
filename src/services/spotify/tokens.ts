import * as SecureStore from 'expo-secure-store';

import { createTokenStore } from './tokenStore';

const KEY = 'copi.spotify.tokens';

/** Tokens de Spotify del conductor en Android: cifrados con SecureStore. */
export const { saveTokens, loadTokens, clearTokens, getValidAccessToken, refreshTokens, expireTokensForTesting } = createTokenStore({
  read: () => SecureStore.getItemAsync(KEY),
  write: (value) => SecureStore.setItemAsync(KEY, value),
  remove: () => SecureStore.deleteItemAsync(KEY),
});
