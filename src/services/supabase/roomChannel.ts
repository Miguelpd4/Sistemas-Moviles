import type { RealtimeChannel, RealtimePostgresChangesPayload } from '@supabase/supabase-js';

import { createEmitter, type Emitter } from '@/lib/emitter';
import type { GameRoundRow, MusicQueueRow, QueueVoteRow, TripMetricsRow } from '@/types/database';
import type { BroadcastEvent, BroadcastEvents, SessionMember } from '@/types/session';

import { supabase } from './client';

/**
 * Canal de la sala (S2-02). Un único canal privado `sala:<id>` por viaje y por móvil, compartido
 * por todas las pantallas que lo necesitan (la Sala y el Modo conductor pueden estar montadas a la
 * vez). Lleva presence (quién está conectado), broadcast (avisos instantáneos) y los cambios de
 * las tablas de la sala, y lo reparte todo por un emisor para que cada componente escuche solo
 * lo suyo.
 *
 * Los canales privados solo admiten a quien cumple las políticas de realtime.messages
 * (migración sala_musica_viaje): los miembros que están dentro.
 */

type Change<T> = { eventType: 'INSERT' | 'UPDATE' | 'DELETE'; new: Partial<T>; old: Partial<T> };

export type RoomStatus = 'conectando' | 'conectado' | 'sin_conexion' | 'sin_permiso';

export type RoomEvents = BroadcastEvents & {
  session: Record<string, unknown>;
  member: Change<SessionMember>;
  queue: Change<MusicQueueRow>;
  vote: Change<QueueVoteRow>;
  metrics: Partial<TripMetricsRow>;
  round: Change<GameRoundRow>;
  presence: ReadonlySet<string>;
  status: RoomStatus;
};

export type RoomIdentity = { userId: string; name: string };

type Room = {
  channel: RealtimeChannel;
  emitter: Emitter<RoomEvents>;
  refs: number;
  online: ReadonlySet<string>;
  status: RoomStatus;
  identity: RoomIdentity;
  closeTimer: ReturnType<typeof setTimeout> | null;
};

export type RoomHandle = {
  on: Emitter<RoomEvents>['on'];
  send: <K extends BroadcastEvent>(event: K, payload: BroadcastEvents[K]) => void;
  online: () => ReadonlySet<string>;
  status: () => RoomStatus;
  release: () => void;
};

const rooms = new Map<string, Room>();
/** Al salir de una pantalla y entrar en otra de la misma sala, el canal se conserva un momento. */
const CLOSE_DELAY_MS = 4000;

function toChange<T>(payload: RealtimePostgresChangesPayload<Record<string, unknown>>): Change<T> {
  return {
    eventType: payload.eventType,
    new: (payload.new ?? {}) as Partial<T>,
    old: (payload.old ?? {}) as Partial<T>,
  };
}

function setStatus(room: Room, status: RoomStatus) {
  room.status = status;
  room.emitter.emit('status', status);
}

function createRoom(sessionId: string, identity: RoomIdentity): Room {
  const emitter = createEmitter<RoomEvents>();
  const channel = supabase.channel(`sala:${sessionId}`, {
    config: { private: true, presence: { key: identity.userId }, broadcast: { self: false } },
  });
  const room: Room = { channel, emitter, refs: 0, online: new Set(), status: 'conectando', identity, closeTimer: null };
  const bySession = `session_id=eq.${sessionId}`;

  channel
    .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'sessions', filter: `id=eq.${sessionId}` }, (payload) =>
      emitter.emit('session', (payload.new ?? {}) as Record<string, unknown>),
    )
    .on('postgres_changes', { event: '*', schema: 'public', table: 'session_members', filter: bySession }, (payload) =>
      emitter.emit('member', toChange<SessionMember>(payload)),
    )
    .on('postgres_changes', { event: '*', schema: 'public', table: 'music_queue', filter: bySession }, (payload) =>
      emitter.emit('queue', toChange<MusicQueueRow>(payload)),
    )
    // Los borrados no se pueden filtrar: llega solo el id y la cola lo quita si lo tiene.
    .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'music_queue' }, (payload) =>
      emitter.emit('queue', toChange<MusicQueueRow>(payload)),
    )
    // queue_votes no tiene session_id: RLS ya limita los votos a los de mis viajes.
    .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'queue_votes' }, (payload) =>
      emitter.emit('vote', toChange<QueueVoteRow>(payload)),
    )
    .on('postgres_changes', { event: '*', schema: 'public', table: 'trip_metrics', filter: bySession }, (payload) =>
      emitter.emit('metrics', (payload.new ?? {}) as Partial<TripMetricsRow>),
    )
    .on('postgres_changes', { event: '*', schema: 'public', table: 'game_rounds', filter: bySession }, (payload) =>
      emitter.emit('round', toChange<GameRoundRow>(payload)),
    )
    .on('presence', { event: 'sync' }, () => {
      room.online = new Set(Object.keys(channel.presenceState()));
      emitter.emit('presence', room.online);
    })
    .on('broadcast', { event: 'pedir_parada' }, ({ payload }) =>
      emitter.emit('pedir_parada', payload as BroadcastEvents['pedir_parada']),
    )
    .on('broadcast', { event: 'ahora_suena' }, ({ payload }) =>
      emitter.emit('ahora_suena', payload as BroadcastEvents['ahora_suena']),
    )
    .on('broadcast', { event: 'ronda' }, ({ payload }) => emitter.emit('ronda', payload as BroadcastEvents['ronda']))
    .on('broadcast', { event: 'control_musica' }, ({ payload }) =>
      emitter.emit('control_musica', payload as BroadcastEvents['control_musica']),
    );

  void (async () => {
    try {
      // El canal privado necesita el JWT del usuario.
      const { data } = await supabase.auth.getSession();
      await supabase.realtime.setAuth(data.session?.access_token ?? null);
    } catch {
      // Si falla, el canal lo intentará con lo que tenga el cliente.
    }
    channel.subscribe((status, error) => {
      if (status === 'SUBSCRIBED') {
        setStatus(room, 'conectado');
        void channel.track({ userId: room.identity.userId, name: room.identity.name, at: Date.now() });
      } else if (status === 'CHANNEL_ERROR') {
        const unauthorized = error?.message?.toLowerCase().includes('unauthorized') ?? false;
        setStatus(room, unauthorized ? 'sin_permiso' : 'sin_conexion');
      } else if (status === 'TIMED_OUT' || status === 'CLOSED') {
        setStatus(room, 'sin_conexion');
      }
    });
  })();

  return room;
}

/** Entra en el canal de la sala (o reutiliza el que ya está abierto en este móvil). */
export function acquireRoom(sessionId: string, identity: RoomIdentity): RoomHandle {
  let room = rooms.get(sessionId);
  if (!room) {
    room = createRoom(sessionId, identity);
    rooms.set(sessionId, room);
  }
  const current = room;
  if (current.closeTimer) {
    clearTimeout(current.closeTimer);
    current.closeTimer = null;
  }
  current.refs += 1;
  // Si cambia el nombre (por ejemplo al cargar el perfil), se actualiza la presencia.
  if (current.identity.name !== identity.name && current.status === 'conectado') {
    current.identity = identity;
    void current.channel.track({ userId: identity.userId, name: identity.name, at: Date.now() });
  }

  let released = false;
  return {
    on: current.emitter.on,
    send: (event, payload) => {
      // El que envía no recibe su propio broadcast: se le entrega aquí a sus otras pantallas.
      current.emitter.emit(event, payload as RoomEvents[typeof event]);
      void current.channel.send({ type: 'broadcast', event, payload });
    },
    online: () => current.online,
    status: () => current.status,
    release: () => {
      if (released) return;
      released = true;
      current.refs -= 1;
      if (current.refs > 0) return;
      current.closeTimer = setTimeout(() => {
        if (current.refs > 0) return;
        rooms.delete(sessionId);
        current.emitter.clear();
        void supabase.removeChannel(current.channel);
      }, CLOSE_DELAY_MS);
    },
  };
}
