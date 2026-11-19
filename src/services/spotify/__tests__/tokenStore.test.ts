import { refreshAsync } from 'expo-auth-session';

import { AppError } from '@/lib/errors';

import { createTokenStore, parseTokens, type TokenStorage } from '../tokenStore';

jest.mock('expo-auth-session', () => ({ refreshAsync: jest.fn() }));
jest.mock('@/config/env', () => ({ env: { spotifyClientId: 'client-de-prueba' } }));

const refreshMock = refreshAsync as jest.MockedFunction<typeof refreshAsync>;

/** Almacén en memoria en lugar de SecureStore o localStorage. */
function memoryStorage(initial: string | null = null): TokenStorage & { value: () => string | null } {
  let value = initial;
  return {
    read: async () => value,
    write: async (next) => {
      value = next;
    },
    remove: async () => {
      value = null;
    },
    value: () => value,
  };
}

const NOW = 1_800_000_000_000;

beforeEach(() => {
  jest.spyOn(Date, 'now').mockReturnValue(NOW);
  refreshMock.mockReset();
});

afterEach(() => {
  jest.restoreAllMocks();
});

describe('parseTokens', () => {
  it('lee unos tokens bien guardados', () => {
    expect(parseTokens(JSON.stringify({ accessToken: 'a', refreshToken: 'r', expiresAt: 5 }))).toEqual({
      accessToken: 'a',
      refreshToken: 'r',
      expiresAt: 5,
    });
  });

  it('devuelve null si no hay nada, si está dañado o si falta un campo', () => {
    expect(parseTokens(null)).toBeNull();
    expect(parseTokens('{no es json')).toBeNull();
    expect(parseTokens(JSON.stringify({ accessToken: 'a', expiresAt: 5 }))).toBeNull();
  });
});

describe('createTokenStore', () => {
  it('guarda y vuelve a leer los tokens', async () => {
    const store = createTokenStore(memoryStorage());
    await store.saveTokens({ accessToken: 'a', refreshToken: 'r', expiresAt: NOW + 3_600_000 });
    expect(await store.loadTokens()).toEqual({ accessToken: 'a', refreshToken: 'r', expiresAt: NOW + 3_600_000 });
  });

  it('borra los datos dañados al leerlos', async () => {
    const storage = memoryStorage('{dañado');
    const store = createTokenStore(storage);
    expect(await store.loadTokens()).toBeNull();
    expect(storage.value()).toBeNull();
  });

  it('sin tokens pide conectar Spotify', async () => {
    const store = createTokenStore(memoryStorage());
    await expect(store.getValidAccessToken()).rejects.toMatchObject({ code: 'SPOTIFY_NOT_CONNECTED' });
  });

  it('usa el token guardado si aún le queda más de un minuto', async () => {
    const store = createTokenStore(memoryStorage());
    await store.saveTokens({ accessToken: 'vigente', refreshToken: 'r', expiresAt: NOW + 120_000 });
    expect(await store.getValidAccessToken()).toBe('vigente');
    expect(refreshMock).not.toHaveBeenCalled();
  });

  it('lo renueva si está a punto de caducar y guarda el nuevo', async () => {
    refreshMock.mockResolvedValue({ accessToken: 'nuevo', refreshToken: undefined, expiresIn: 3600 } as Awaited<
      ReturnType<typeof refreshAsync>
    >);
    const store = createTokenStore(memoryStorage());
    await store.saveTokens({ accessToken: 'viejo', refreshToken: 'r1', expiresAt: NOW + 30_000 });

    expect(await store.getValidAccessToken()).toBe('nuevo');
    expect(refreshMock).toHaveBeenCalledWith({ clientId: 'client-de-prueba', refreshToken: 'r1' }, expect.anything());
    // Spotify no devolvió refresh token nuevo: se mantiene el anterior.
    expect(await store.loadTokens()).toEqual({ accessToken: 'nuevo', refreshToken: 'r1', expiresAt: NOW + 3_600_000 });
  });

  it('si la renovación falla, borra los tokens y pide volver a conectar', async () => {
    refreshMock.mockRejectedValue(new Error('invalid_grant'));
    const storage = memoryStorage();
    const store = createTokenStore(storage);
    await store.saveTokens({ accessToken: 'viejo', refreshToken: 'r1', expiresAt: NOW - 1 });

    const error = await store.getValidAccessToken().catch((err: unknown) => err);
    expect(error).toBeInstanceOf(AppError);
    expect(error).toMatchObject({ code: 'SPOTIFY_NOT_CONNECTED' });
    expect(storage.value()).toBeNull();
  });

  it('expireTokensForTesting deja el token caducado', async () => {
    const store = createTokenStore(memoryStorage());
    await store.saveTokens({ accessToken: 'a', refreshToken: 'r', expiresAt: NOW + 3_600_000 });
    await store.expireTokensForTesting();
    expect((await store.loadTokens())?.expiresAt).toBeLessThan(NOW);
  });
});
