import { useEffect, useMemo, useState } from 'react';

import { djState, readDjPayload } from '@/lib/games/dj';
import { getDjSongs, type QueueRow } from '@/services/supabase/queue';

import { useActiveRound } from './useActiveRound';
import { useSession } from './useSession';

type LoadedSongs = { roundId: string; rows: QueueRow[] };

/**
 * La ronda de DJ de la sala (#20): la ronda, sus canciones en vivo (cualquier estado), en qué fase
 * está y a quién le toca. Las respuestas y quién ha votado vienen de `useActiveRound('dj')`.
 */
export function useDjRound() {
  const { on, members } = useSession();
  const active = useActiveRound('dj');
  const roundId = active.round?.id ?? null;
  const [loaded, setLoaded] = useState<LoadedSongs | null>(null);

  useEffect(() => {
    if (roundId === null) return;
    let alive = true;
    getDjSongs(roundId)
      .then((rows) => {
        if (alive) setLoaded({ roundId, rows });
      })
      .catch(() => undefined);
    return () => {
      alive = false;
    };
  }, [roundId]);

  // Cambios de la cola: solo los de esta ronda.
  useEffect(() => {
    if (roundId === null) return;
    return on('queue', (change) => {
      if (change.eventType === 'DELETE') {
        const id = change.old.id;
        if (id) setLoaded((current) => (current ? { ...current, rows: current.rows.filter((row) => row.id !== id) } : current));
        return;
      }
      const row = change.new as QueueRow;
      if (row.dj_round_id !== roundId) return;
      setLoaded((current) => {
        const rows = current?.roundId === roundId ? current.rows : [];
        return { roundId, rows: [...rows.filter((item) => item.id !== row.id), row].sort((a, b) => a.created_at.localeCompare(b.created_at)) };
      });
    });
  }, [on, roundId]);

  const songs = useMemo(() => (loaded !== null && loaded.roundId === roundId ? loaded.rows : []), [loaded, roundId]);
  const payload = useMemo(() => readDjPayload(active.round?.payload), [active.round?.payload]);
  const insideIds = useMemo(() => new Set(members.map((member) => member.user_id)), [members]);
  const state = useMemo(
    () => (active.round === null ? null : djState({ payload, insideIds, songs })),
    [active.round, payload, insideIds, songs],
  );

  return { ...active, songs, payload, insideIds, state };
}

export type DjRound = ReturnType<typeof useDjRound>;
