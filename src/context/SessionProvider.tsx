import { router } from 'expo-router';
import { createContext, useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { AppState } from 'react-native';

import { useAuth } from '@/hooks/useAuth';
import { createEmitter } from '@/lib/emitter';
import { errorMessage } from '@/lib/errors';
import { acquireRoom, type RoomEvents, type RoomHandle, type RoomStatus } from '@/services/supabase/roomChannel';
import { applySessionRow, getSessionMembers, getSessionWithCar, type SessionWithCar } from '@/services/supabase/sessions';
import type { BroadcastEvent, BroadcastEvents, SessionMember } from '@/types/session';

/**
 * La sala en tiempo real (S2-02): el viaje, sus miembros, quién está conectado y los avisos
 * instantáneos. Envuelve las pestañas de la sala y el Modo conductor.
 */

export type SessionContextValue = {
  sessionId: string;
  session: SessionWithCar | null;
  /** Los que están dentro, ordenados por asiento. */
  members: SessionMember[];
  /** Los que esperan aprobación. */
  pending: SessionMember[];
  me: SessionMember | null;
  myId: string | null;
  isHost: boolean;
  isAdmin: boolean;
  online: ReadonlySet<string>;
  status: RoomStatus;
  loading: boolean;
  error: string | null;
  reload: () => Promise<void>;
  send: <K extends BroadcastEvent>(event: K, payload: BroadcastEvents[K]) => void;
  on: <K extends keyof RoomEvents>(event: K, handler: (payload: RoomEvents[K]) => void) => () => void;
};

export const SessionContext = createContext<SessionContextValue | null>(null);

/** Eventos del canal que se reenvían a los componentes. */
const FORWARDED: readonly (keyof RoomEvents)[] = [
  'session',
  'member',
  'queue',
  'vote',
  'metrics',
  'round',
  'presence',
  'status',
  'pedir_parada',
  'ahora_suena',
  'ronda',
];

const bySeat = (a: SessionMember, b: SessionMember) => (a.seat ?? 99) - (b.seat ?? 99);

function upsertMember(list: SessionMember[], row: Partial<SessionMember>): SessionMember[] {
  if (!row.user_id) return list;
  const index = list.findIndex((member) => member.user_id === row.user_id);
  if (index === -1) return row.session_id ? [...list, row as SessionMember] : list;
  const next = [...list];
  next[index] = { ...next[index], ...row } as SessionMember;
  return next;
}

type Props = { sessionId: string; children: ReactNode };

export function SessionProvider({ sessionId, children }: Props) {
  const { user, profile } = useAuth();
  const myId = user?.id ?? null;
  const [session, setSession] = useState<SessionWithCar | null>(null);
  const [allMembers, setAllMembers] = useState<SessionMember[]>([]);
  const [online, setOnline] = useState<ReadonlySet<string>>(new Set());
  const [status, setStatus] = useState<RoomStatus>('conectando');
  const [loading, setLoading] = useState(true);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const roomRef = useRef<RoomHandle | null>(null);
  // Emisor propio y estable: los hijos se suscriben aunque el canal aún no exista (sus efectos
  // se ejecutan antes que los del proveedor) y el canal le reenvía todo.
  const [local] = useState(() => createEmitter<RoomEvents>());

  const reload = useCallback(async () => {
    try {
      const [nextSession, nextMembers] = await Promise.all([getSessionWithCar(sessionId), getSessionMembers(sessionId)]);
      setSession(nextSession);
      setAllMembers(nextMembers);
      setError(null);
      setLoaded(true);
    } catch (err) {
      setError(errorMessage(err, 'No se ha podido cargar el viaje.'));
    } finally {
      setLoading(false);
    }
  }, [sessionId]);

  // Carga inicial y al volver a primer plano (por si se perdió algún evento).
  useEffect(() => {
    setLoading(true);
    void reload();
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') void reload();
    });
    return () => subscription.remove();
  }, [reload]);

  // Canal de la sala.
  const myName = allMembers.find((member) => member.user_id === myId)?.display_name ?? profile?.display_name ?? '';
  const nameRef = useRef(myName);
  useEffect(() => {
    nameRef.current = myName;
  }, [myName]);

  useEffect(() => {
    if (myId === null) return;
    const room = acquireRoom(sessionId, { userId: myId, name: nameRef.current });
    roomRef.current = room;
    setOnline(room.online());
    setStatus(room.status());
    const forwarded = FORWARDED.map((event) =>
      room.on(event, (payload: RoomEvents[typeof event]) => local.emit(event, payload)),
    );
    const offs = [
      ...forwarded,
      room.on('session', (row) => setSession((current) => (current ? applySessionRow(current, row) : current))),
      room.on('member', (change) => {
        if (change.eventType === 'DELETE') {
          setAllMembers((list) => list.filter((member) => member.user_id !== change.old.user_id));
        } else {
          setAllMembers((list) => upsertMember(list, change.new));
        }
      }),
      room.on('presence', (set) => setOnline(new Set(set))),
      room.on('status', (next) => {
        setStatus(next);
        // Al reconectar, se recarga por si se perdió algo mientras tanto.
        if (next === 'conectado') void reload();
      }),
    ];
    return () => {
      offs.forEach((off) => off());
      room.release();
      roomRef.current = null;
    };
  }, [sessionId, myId, reload, local]);

  const me = useMemo(() => allMembers.find((member) => member.user_id === myId) ?? null, [allMembers, myId]);
  const members = useMemo(() => allMembers.filter((member) => member.status === 'dentro').sort(bySeat), [allMembers]);
  const pending = useMemo(() => allMembers.filter((member) => member.status === 'pendiente'), [allMembers]);
  const isHost = session !== null && myId !== null && session.hostId === myId;
  const isAdmin = me !== null && me.status === 'dentro' && (me.role === 'conductor' || me.role === 'copiloto');

  // Reglas de navegación.
  const finished = session?.status === 'finalizada';
  const outside = loaded && myId !== null && !isHost && (me === null || me.status !== 'dentro');
  useEffect(() => {
    if (finished) {
      router.replace({ pathname: '/resumen/[sessionId]', params: { sessionId } });
    } else if (outside) {
      router.replace({ pathname: '/', params: { aviso: 'fuera' } });
    }
  }, [finished, outside, sessionId]);

  const send = useCallback<SessionContextValue['send']>((event, payload) => {
    roomRef.current?.send(event, payload);
  }, []);
  const on = useCallback<SessionContextValue['on']>((event, handler) => local.on(event, handler), [local]);

  const value = useMemo<SessionContextValue>(
    () => ({
      sessionId,
      session,
      members,
      pending,
      me,
      myId,
      isHost,
      isAdmin,
      online,
      status,
      loading,
      error,
      reload,
      send,
      on,
    }),
    [sessionId, session, members, pending, me, myId, isHost, isAdmin, online, status, loading, error, reload, send, on],
  );

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}
