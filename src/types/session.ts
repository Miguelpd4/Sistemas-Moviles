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

/** Órdenes al reproductor del Modo conductor desde Música (#60). Pasar a la siguiente va por la RPC skip_song. */
export type MusicControl = 'pause' | 'play' | 'restart';

/** Avisos instantáneos de la sala (Broadcast, no se guardan). */
export type BroadcastEvents = {
  /** Un pasajero pide parar. */
  pedir_parada: { userId: string; name: string };
  /** El móvil del conductor, cada 5 s: lo que suena y por dónde va. */
  ahora_suena: { queueId: string | null; progressMs: number; durationMs: number; isPlaying: boolean };
  /** Alguien ha respondido a una ronda (para mostrar «3 de 4 han respondido»). */
  ronda: { roundId: string; userId: string };
  /** El conductor o el copiloto controlan la música desde Música (#60). */
  control_musica: { action: MusicControl; userId: string };
};

export type BroadcastEvent = keyof BroadcastEvents;
