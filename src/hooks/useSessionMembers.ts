import { useCallback, useEffect, useMemo, useState } from 'react';
import { AppState } from 'react-native';

import { errorMessage } from '@/lib/errors';
import { supabase } from '@/services/supabase/client';
import { uniqueChannelName } from '@/services/supabase/realtime';
import { getSessionMembers } from '@/services/supabase/sessions';
import type { SessionMember } from '@/types/session';

/**
 * Miembros de un viaje en vivo (S1-08). Carga la lista y la vuelve a pedir ante cualquier cambio
 * de `session_members`. En el Sprint 2 lo sustituye el SessionProvider.
 */
export function useSessionMembers(sessionId: string | null) {
  const [members, setMembers] = useState<SessionMember[]>([]);
  const [loading, setLoading] = useState(sessionId !== null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (sessionId === null) return;
    try {
      setMembers(await getSessionMembers(sessionId));
      setError(null);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setLoading(false);
    }
  }, [sessionId]);

  useEffect(() => {
    if (sessionId === null) return;
    setLoading(true);
    void load();

    const channel = supabase
      .channel(uniqueChannelName(`miembros:${sessionId}`))
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'session_members', filter: `session_id=eq.${sessionId}` },
        () => void load(),
      )
      .subscribe();

    // Al volver a primer plano se recarga, por si se perdió algún evento.
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') void load();
    });

    return () => {
      subscription.remove();
      void supabase.removeChannel(channel);
    };
  }, [sessionId, load]);

  /** Solo los que están dentro, ordenados por asiento (sin asiento al final). */
  const inside = useMemo(
    () =>
      members
        .filter((member) => member.status === 'dentro')
        .sort((a, b) => (a.seat ?? 99) - (b.seat ?? 99)),
    [members],
  );

  return { members, inside, loading, error, reload: load };
}
