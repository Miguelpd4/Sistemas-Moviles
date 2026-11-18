import { useEffect, useRef } from 'react';

import type { RoomEvents } from '@/services/supabase/roomChannel';

import { useSession } from './useSession';

/**
 * Suscribe un componente a un evento de la sala y se desuscribe al desmontar. Solo ese
 * componente se vuelve a pintar cuando llega el evento.
 */
export function useBroadcast<K extends keyof RoomEvents>(event: K, handler: (payload: RoomEvents[K]) => void): void {
  const { on } = useSession();
  const handlerRef = useRef(handler);
  useEffect(() => {
    handlerRef.current = handler;
  }, [handler]);
  useEffect(() => on(event, (payload) => handlerRef.current(payload)), [on, event]);
}
