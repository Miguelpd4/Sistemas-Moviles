/**
 * Errores de la app con mensaje para el usuario (en español).
 * Los servicios convierten cualquier error en `AppError` con `toAppError`, y las pantallas
 * muestran `error.message` tal cual.
 */

/** Códigos que lanzan las RPC con `raise exception 'CODIGO'` y su mensaje para el usuario. */
export const RPC_MESSAGES = {
  NOT_AUTHENTICATED: 'No se ha podido iniciar la sesión. Revisa tu conexión y vuelve a intentarlo.',
  CAR_NOT_FOUND: 'No encontramos tu coche. Revísalo en Mi coche.',
  NO_ACTIVE_SESSION:
    'Este coche no tiene ningún viaje abierto ahora mismo. Pídele al conductor que cree uno.',
  INVALID_SEAT: 'Ese asiento no existe en este coche.',
  INVALID_NAME: 'Escribe un nombre de 1 a 30 caracteres.',
  SEAT_TAKEN: 'Alguien acaba de coger ese asiento. Elige otro.',
  JOIN_REJECTED: 'El conductor no ha aceptado tu entrada en este viaje.',
  NOT_ADMIN: 'Solo el conductor o el copiloto pueden hacer esto.',
  NOT_HOST: 'Solo el conductor puede hacer esto.',
  NOT_PENDING: 'Esta persona ya no está esperando.',
  NOT_MEMBER: 'Ya no estás en este viaje.',
  HOST_CANNOT_LEAVE: 'El conductor no puede salir de la sala; puede finalizar el viaje.',
  QUEUE_LIMIT: 'Ya tienes 3 canciones en la cola. Espera a que suene alguna.',
  NOT_PLAYING: 'Esa canción ya no está sonando.',
  INVALID_PRICE: 'El precio del combustible no es válido.',
  TRIP_NOT_OPEN: 'El viaje ya ha empezado o ha terminado.',
  TRIP_ALREADY_ENDED: 'El viaje ya ha terminado.',
  GAME_IN_PROGRESS: 'Ya hay un juego en marcha. Termínalo antes de empezar otro.',
  ROUND_CLOSED: 'Se acabó el tiempo para responder.',
  TOO_EARLY: 'Todavía no se puede ver el resultado.',
  NOTHING_PLAYING: 'Ahora no suena ninguna canción. Espera a que empiece la siguiente.',
  SONG_ALREADY_USED: 'Ya habéis jugado con esta canción. Espera a la siguiente.',
  NOT_ENOUGH_PLAYERS: 'Hacen falta al menos 3 personas en el coche.',
  OWN_SONG: 'Esta canción la has puesto tú: esta vez no respondes.',
  NOT_ENOUGH_DJS: 'Hacen falta al menos 2 pasajeros para los turnos de DJ.',
  NOT_YOUR_TURN: 'Todavía no te toca elegir. Espera tu turno de DJ.',
  VOTING_NOT_OPEN: 'Se vota cuando hayan sonado todas las canciones de la ronda.',
  INVALID_OPTION: 'Esa opción no es de esta ronda.',
  WRONG_GAME: 'Esa respuesta no es de este juego. Actualiza la app.',
  DRIVER_CANT_PLAY: 'El conductor conduce: este juego es para los pasajeros.',
  PLATE_INVALID: 'Escribe la matrícula como 1234 BCD (cuatro números y tres consonantes).',
  PLATE_NO_MATCH: 'Esa matrícula no cumple el reto. ¡Sigue buscando!',
  ALREADY_FOUND: 'Ya has encontrado tu matrícula en esta ronda.',
  INVALID_DESTINATION: 'Ese destino no es válido. Búscalo otra vez.',
  NOT_ENOUGH_SONGS: 'Hacen falta al menos 3 canciones distintas en el viaje (y alguna que no haya salido ya). Añadid más en Música.',
} as const;

export type RpcErrorCode = keyof typeof RPC_MESSAGES;

export const NETWORK_MESSAGE = 'No hay conexión a internet. Revisa tu conexión y vuelve a intentarlo.';

export class AppError extends Error {
  readonly code: string | undefined;
  /** Error original, para depurar. No se muestra al usuario. */
  readonly details: unknown;

  constructor(message: string, options: { code?: string; details?: unknown } = {}) {
    super(message);
    this.name = 'AppError';
    this.code = options.code;
    this.details = options.details;
  }
}

/** Saca el texto de un error de cualquier tipo (Error, PostgrestError, AuthError, texto). */
export function rawErrorMessage(error: unknown): string {
  if (typeof error === 'string') return error;
  if (typeof error === 'object' && error !== null && 'message' in error) {
    const message = (error as { message: unknown }).message;
    if (typeof message === 'string') return message;
  }
  return '';
}

const NETWORK_PATTERNS = ['Network request failed', 'Failed to fetch', 'NetworkError', 'Load failed'];

/** Convierte cualquier error en un `AppError` con un mensaje claro en español. */
export function toAppError(error: unknown, fallback: string): AppError {
  if (error instanceof AppError) return error;

  const message = rawErrorMessage(error);
  const code = (Object.keys(RPC_MESSAGES) as RpcErrorCode[]).find((key) => message.includes(key));
  if (code !== undefined) {
    return new AppError(RPC_MESSAGES[code], { code, details: error });
  }
  if (NETWORK_PATTERNS.some((pattern) => message.includes(pattern))) {
    return new AppError(NETWORK_MESSAGE, { code: 'NETWORK', details: error });
  }
  return new AppError(fallback, { details: error });
}

/** Mensajes de Supabase Auth (vienen en inglés) traducidos para el usuario. */
const AUTH_MESSAGES: readonly [pattern: string, message: string][] = [
  ['Invalid login credentials', 'Email o contraseña incorrectos.'],
  ['User already registered', 'Ya existe una cuenta con ese email. Entra con tu contraseña.'],
  ['Email not confirmed', 'Confirma tu email antes de entrar (revisa tu correo).'],
  ['Password should be at least', 'La contraseña debe tener al menos 8 caracteres.'],
  ['Anonymous sign-ins are disabled', 'El acceso sin registro está desactivado en Supabase (Authentication → Sign In / Providers).'],
  ['rate limit', 'Demasiados intentos seguidos. Espera un momento y vuelve a intentarlo.'],
];

/** Como `toAppError`, pero reconoce también los mensajes de Supabase Auth. */
export function toAuthError(error: unknown, fallback: string): AppError {
  const message = rawErrorMessage(error);
  const known = AUTH_MESSAGES.find(([pattern]) => message.toLowerCase().includes(pattern.toLowerCase()));
  return known ? new AppError(known[1], { code: 'AUTH', details: error }) : toAppError(error, fallback);
}

/** Mensaje para mostrar en pantalla a partir de cualquier error. */
export function errorMessage(error: unknown, fallback = 'Algo ha fallado. Vuelve a intentarlo.'): string {
  return toAppError(error, fallback).message;
}
