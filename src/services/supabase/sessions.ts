import { AppError, toAppError } from '@/lib/errors';
import type { Json } from '@/types/database';
import type { FuelType } from '@/lib/carForm';
import type {
  JoinInput,
  JoinMode,
  JoinResult,
  MemberRole,
  MemberStatus,
  SessionMember,
  SessionPreview,
  SessionStatus,
} from '@/types/session';

import { supabase } from './client';

function isObject(value: Json): value is { [key: string]: Json | undefined } {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function textOrNull(value: Json | undefined): string | null {
  return typeof value === 'string' && value !== '' ? value : null;
}

/** Comprueba la forma de lo que devuelve get_session_preview. */
export function parseSessionPreview(value: Json): SessionPreview {
  if (!isObject(value) || typeof value.session_id !== 'string' || !Array.isArray(value.taken_seats)) {
    throw new AppError('Respuesta inesperada del servidor. Actualiza la app.');
  }
  return {
    session_id: value.session_id,
    status: String(value.status) as SessionStatus,
    join_mode: value.join_mode === 'aprobacion' ? 'aprobacion' : 'libre',
    car_name: String(value.car_name ?? ''),
    car_make: textOrNull(value.car_make),
    car_model: textOrNull(value.car_model),
    car_version: textOrNull(value.car_version),
    car_color: textOrNull(value.car_color),
    car_photo_path: textOrNull(value.car_photo_path),
    car_image_url: textOrNull(value.car_image_url),
    seats: Number(value.seats ?? 5),
    driver_name: String(value.driver_name ?? 'el conductor'),
    driver_avatar_kind: String(value.driver_avatar_kind ?? 'preset'),
    driver_avatar_value: String(value.driver_avatar_value ?? 'avatar-01'),
    taken_seats: value.taken_seats.filter((seat): seat is number => typeof seat === 'number'),
    my_status: typeof value.my_status === 'string' ? (value.my_status as MemberStatus) : null,
  };
}

/** Crea el viaje del coche, o devuelve el que ya está abierto. */
export async function startSession(carId: string): Promise<string> {
  const { data, error } = await supabase.rpc('start_session', { p_car_id: carId });
  if (error) throw toAppError(error, 'No se ha podido crear el viaje.');
  return data;
}

export async function getSessionPreview(nfcCode: string): Promise<SessionPreview> {
  const { data, error } = await supabase.rpc('get_session_preview', { p_nfc_code: nfcCode });
  if (error) throw toAppError(error, 'No se ha podido cargar el viaje.');
  return parseSessionPreview(data);
}

export async function joinSession(input: JoinInput): Promise<JoinResult> {
  const { data, error } = await supabase.rpc('join_session', {
    p_nfc_code: input.nfcCode,
    p_display_name: input.displayName.trim(),
    p_avatar_kind: input.avatarKind,
    p_avatar_value: input.avatarValue,
    p_seat: input.seat,
  });
  if (error) throw toAppError(error, 'No se ha podido entrar en el viaje.');
  if (!isObject(data) || typeof data.session_id !== 'string') {
    throw new AppError('Respuesta inesperada del servidor. Actualiza la app.');
  }
  return { session_id: data.session_id, status: data.status === 'pendiente' ? 'pendiente' : 'dentro' };
}

/** Miembros de un viaje (todos los que el usuario puede ver según RLS). */
export async function getSessionMembers(sessionId: string): Promise<SessionMember[]> {
  const { data, error } = await supabase
    .from('session_members')
    .select('*')
    .eq('session_id', sessionId)
    .order('seat', { ascending: true, nullsFirst: false });
  if (error) throw toAppError(error, 'No se ha podido cargar quién está en el coche.');
  return data as SessionMember[];
}

/** Lo que se necesita para dibujar el coche (foto propia, foto del modelo o silueta). */
export type CarLook = {
  name: string;
  make: string | null;
  model: string | null;
  version: string | null;
  color: string | null;
  photoPath: string | null;
  imageUrl: string | null;
};

export type SessionWithCar = {
  id: string;
  status: SessionStatus;
  joinMode: JoinMode;
  hostId: string;
  startedAt: string | null;
  endedAt: string | null;
  fuelPriceEurL: number | null;
  consumptionL100km: number;
  fuelType: FuelType;
  carName: string;
  nfcCode: string;
  seats: number;
  car: CarLook;
  /** #29 · Adónde va el viaje (lo pone el conductor o el copiloto). */
  destination: Destination | null;
};

export type Destination = { name: string; lat: number; lon: number };

function readDestination(name: unknown, lat: unknown, lon: unknown): Destination | null {
  if (typeof name !== 'string' || lat === null || lon === null || lat === undefined || lon === undefined) return null;
  const latN = Number(lat);
  const lonN = Number(lon);
  return Number.isFinite(latN) && Number.isFinite(lonN) ? { name, lat: latN, lon: lonN } : null;
}

export async function getSessionWithCar(sessionId: string): Promise<SessionWithCar> {
  const { data, error } = await supabase
    .from('sessions')
    .select(
      'id, status, join_mode, host_id, started_at, ended_at, fuel_price_eur_l, consumption_l_100km, destination_name, destination_lat, destination_lon, cars ( name, nfc_code, seats, fuel_type, make, model, version, color, photo_path, model_image_url )',
    )
    .eq('id', sessionId)
    .single();
  if (error) throw toAppError(error, 'No se ha podido cargar el viaje.');
  const car = data.cars;
  if (!car) throw new AppError('No se ha encontrado el coche de este viaje.');
  return {
    id: data.id,
    status: data.status as SessionStatus,
    joinMode: data.join_mode === 'aprobacion' ? 'aprobacion' : 'libre',
    hostId: data.host_id,
    startedAt: data.started_at,
    endedAt: data.ended_at,
    fuelPriceEurL: data.fuel_price_eur_l === null ? null : Number(data.fuel_price_eur_l),
    consumptionL100km: Number(data.consumption_l_100km),
    fuelType: car.fuel_type as FuelType,
    carName: car.name,
    nfcCode: car.nfc_code,
    seats: car.seats,
    car: {
      name: car.name,
      make: car.make,
      model: car.model,
      version: car.version,
      color: car.color,
      photoPath: car.photo_path,
      imageUrl: car.model_image_url,
    },
    destination: readDestination(data.destination_name, data.destination_lat, data.destination_lon),
  };
}

export type CurrentTrip = {
  sessionId: string;
  role: MemberRole;
  status: SessionStatus;
  carName: string;
  driverName: string;
};

/** El viaje no finalizado en el que está el usuario, si hay alguno. */
export async function getCurrentTrip(userId: string): Promise<CurrentTrip | null> {
  const { data, error } = await supabase
    .from('session_members')
    .select('session_id, role, joined_at, sessions!inner ( status, cars ( name ) )')
    .eq('user_id', userId)
    .eq('status', 'dentro')
    .in('sessions.status', ['abierta', 'en_curso'])
    .order('joined_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw toAppError(error, 'No se ha podido comprobar si tienes un viaje en curso.');
  if (!data) return null;

  const { data: driver } = await supabase
    .from('session_members')
    .select('display_name')
    .eq('session_id', data.session_id)
    .eq('role', 'conductor')
    .maybeSingle();

  return {
    sessionId: data.session_id,
    role: data.role as MemberRole,
    status: data.sessions.status as SessionStatus,
    carName: data.sessions.cars?.name ?? 'el coche',
    driverName: driver?.display_name ?? 'el conductor',
  };
}

/** Fila de sessions recibida por Realtime: actualiza solo lo que cambia durante el viaje. */
export function applySessionRow(session: SessionWithCar, row: Record<string, unknown>): SessionWithCar {
  return {
    ...session,
    status: (typeof row.status === 'string' ? row.status : session.status) as SessionStatus,
    joinMode: row.join_mode === 'aprobacion' ? 'aprobacion' : row.join_mode === 'libre' ? 'libre' : session.joinMode,
    startedAt: typeof row.started_at === 'string' ? row.started_at : session.startedAt,
    endedAt: typeof row.ended_at === 'string' ? row.ended_at : session.endedAt,
    fuelPriceEurL: row.fuel_price_eur_l != null ? Number(row.fuel_price_eur_l) : session.fuelPriceEurL,
    destination:
      'destination_lat' in row ? readDestination(row.destination_name, row.destination_lat, row.destination_lon) : session.destination,
  };
}

// Gestión de la sala (S2-03) -------------------------------------------------

export async function reviewJoin(sessionId: string, userId: string, accept: boolean): Promise<void> {
  const { error } = await supabase.rpc('review_join', { p_session_id: sessionId, p_user_id: userId, p_accept: accept });
  if (error) throw toAppError(error, accept ? 'No se ha podido aceptar.' : 'No se ha podido rechazar.');
}

/** null quita el copiloto actual. */
export async function setCopilot(sessionId: string, userId: string | null): Promise<void> {
  const { error } = await supabase.rpc('set_copilot', { p_session_id: sessionId, p_user_id: userId });
  if (error) throw toAppError(error, 'No se ha podido cambiar el copiloto.');
}

export async function setJoinMode(sessionId: string, mode: JoinMode): Promise<void> {
  const { error } = await supabase.rpc('set_join_mode', { p_session_id: sessionId, p_join_mode: mode });
  if (error) throw toAppError(error, 'No se ha podido cambiar cómo se entra.');
}

export async function leaveSession(sessionId: string): Promise<void> {
  const { error } = await supabase.rpc('leave_session', { p_session_id: sessionId });
  if (error) throw toAppError(error, 'No se ha podido salir del viaje.');
}

/** #29 · El conductor o el copiloto ponen (o quitan, con null) el destino del viaje. */
export async function setDestination(sessionId: string, destination: Destination | null): Promise<void> {
  const { error } = await supabase.rpc('set_destination', {
    p_session_id: sessionId,
    p_name: destination?.name ?? null,
    p_lat: destination?.lat ?? null,
    p_lon: destination?.lon ?? null,
  });
  if (error) throw toAppError(error, 'No se ha podido guardar el destino.');
}
