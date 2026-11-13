import { AppError, NETWORK_MESSAGE, RPC_MESSAGES, errorMessage, toAppError, toAuthError } from '../errors';

describe('toAppError', () => {
  it('traduce un código de RPC dentro del mensaje', () => {
    const error = toAppError({ message: 'SEAT_TAKEN', code: 'P0001' }, 'fallo');
    expect(error).toBeInstanceOf(AppError);
    expect(error.message).toBe(RPC_MESSAGES.SEAT_TAKEN);
    expect(error.code).toBe('SEAT_TAKEN');
  });

  it('usa el mensaje por defecto con un error desconocido', () => {
    expect(toAppError(new Error('algo raro'), 'No se pudo guardar').message).toBe('No se pudo guardar');
    expect(toAppError(undefined, 'No se pudo guardar').message).toBe('No se pudo guardar');
  });

  it('reconoce los errores de red', () => {
    expect(toAppError(new TypeError('Network request failed'), 'x').message).toBe(NETWORK_MESSAGE);
    expect(toAppError(new TypeError('Failed to fetch'), 'x').message).toBe(NETWORK_MESSAGE);
  });

  it('devuelve el mismo AppError si ya lo es', () => {
    const original = new AppError('Ya traducido');
    expect(toAppError(original, 'x')).toBe(original);
  });

  it('traduce los errores de Supabase Auth', () => {
    expect(toAuthError({ message: 'Invalid login credentials' }, 'x').message).toBe('Email o contraseña incorrectos.');
    expect(toAuthError({ message: 'User already registered' }, 'x').message).toContain('Ya existe');
    expect(toAuthError({ message: 'SEAT_TAKEN' }, 'x').message).toBe(RPC_MESSAGES.SEAT_TAKEN);
    expect(toAuthError({ message: 'otra cosa' }, 'No se pudo entrar').message).toBe('No se pudo entrar');
  });

  it('errorMessage da el texto para la pantalla', () => {
    expect(errorMessage('NO_ACTIVE_SESSION')).toBe(RPC_MESSAGES.NO_ACTIVE_SESSION);
    expect(errorMessage(null)).toBe('Algo ha fallado. Vuelve a intentarlo.');
  });
});
