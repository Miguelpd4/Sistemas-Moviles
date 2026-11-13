import { AppError, toAppError } from '@/lib/errors';
import type { Json } from '@/types/database';
import type {
  JoinInput,
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
    seats: Number(value.seats ?? 5),
    driver_name: String(value.driver_name ?? 'el conductor'),
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

export type SessionWithCar = {
  id: string;
  status: SessionStatus;
  hostId: string;
  carName: string;
  nfcCode: string;
  seats: number;
};

export async function getSessionWithCar(sessionId: string): Promise<SessionWithCar> {
  const { data, error } = await supabase
    .from('sessions')
    .select('id, status, host_id, cars ( name, nfc_code, seats )')
    .eq('id', sessionId)
    .single();
  if (error) throw toAppError(error, 'No se ha podido cargar el viaje.');
  const car = data.cars;
  if (!car) throw new AppError('No se ha encontrado el coche de este viaje.');
  return {
    id: data.id,
    status: data.status as SessionStatus,
    hostId: data.host_id,
    carName: car.name,
    nfcCode: car.nfc_code,
    seats: car.seats,
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
