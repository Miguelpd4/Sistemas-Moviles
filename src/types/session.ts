import type { AvatarKind } from '../lib/avatars';

export type MemberStatus = 'pendiente' | 'dentro' | 'rechazado' | 'fuera';
export type MemberRole = 'conductor' | 'copiloto' | 'pasajero';
export type SessionStatus = 'abierta' | 'en_curso' | 'finalizada';
export type JoinMode = 'libre' | 'aprobacion';

/** Lo que devuelve la RPC `get_session_preview`. */
export type SessionPreview = {
  session_id: string;
  status: SessionStatus;
  join_mode: JoinMode;
  car_name: string;
  car_make: string | null;
  car_model: string | null;
  car_version: string | null;
  car_color: string | null;
  /** Foto propia del coche (ruta en el cubo «coches»). */
  car_photo_path: string | null;
  /** Foto del modelo (Wikipedia). */
  car_image_url: string | null;
  seats: number;
  driver_name: string;
  driver_avatar_kind: string;
  driver_avatar_value: string;
  taken_seats: number[];
  my_status: MemberStatus | null;
};

/** Lo que devuelve la RPC `join_session`. */
export type JoinResult = {
  session_id: string;
  status: Extract<MemberStatus, 'pendiente' | 'dentro'>;
};

export type JoinInput = {
  nfcCode: string;
  displayName: string;
  avatarKind: AvatarKind;
  avatarValue: string;
  seat: number | null;
};

/** Una fila de `session_members`. */
export type SessionMember = {
  session_id: string;
  user_id: string;
  role: MemberRole;
  status: MemberStatus;
  seat: number | null;
  display_name: string;
  avatar_kind: AvatarKind;
  avatar_value: string;
  joined_at: string;
  left_at: string | null;
};
