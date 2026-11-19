import { useCallback, useEffect, useMemo, useState } from 'react';

import { errorMessage } from '@/lib/errors';
import { getQueue, type QueueRow } from '@/services/supabase/queue';

import { useSession } from './useSession';

const ACTIVE = new Set(['en_cola', 'sonando']);

/**
 * Cola de música de la sala en vivo (S2-05): carga las canciones en cola o sonando y aplica los
 * cambios que llegan por el canal de la sala.
 */
export function useQueue() {
  const { sessionId, on, myId } = useSession();
  const [items, setItems] = useState<QueueRow[]>([]);
  /** La última fila que sonaba, también si acaba de saltarse (el reproductor la necesita). */
  const [lastChange, setLastChange] = useState<QueueRow | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Con promesas encadenadas (no async/await): el estado solo cambia cuando llega la respuesta.
  const reload = useCallback(
    () =>
      getQueue(sessionId)
        .then((rows) => {
          setItems(rows);
          setError(null);
        })
        .catch((err: unknown) => setError(errorMessage(err, 'No se ha podido cargar la cola.')))
        .finally(() => setLoading(false)),
    [sessionId],
  );

  useEffect(() => {
    void reload();
  }, [reload]);

  useEffect(
    () =>
      on('queue', (change) => {
        if (change.eventType === 'DELETE') {
          const id = change.old.id;
          if (id) setItems((list) => list.filter((item) => item.id !== id));
          return;
        }
        const row = change.new as QueueRow;
        if (!row.id || row.session_id !== sessionId) return;
        setLastChange(row);
        setItems((list) => {
          const rest = list.filter((item) => item.id !== row.id);
          if (!ACTIVE.has(row.status)) return rest;
          return [...rest, row].sort((a, b) => a.created_at.localeCompare(b.created_at));
        });
      }),
    [on, sessionId],
  );

  // Al reconectar el canal se recarga, por si se perdió algún cambio.
  useEffect(() => on('status', (status) => status === 'conectado' && void reload()), [on, reload]);

  return useMemo(() => {
    const nowPlaying = items.find((item) => item.status === 'sonando') ?? null;
    const upcoming = items.filter((item) => item.status === 'en_cola');
    const myCount = upcoming.filter((item) => item.added_by === myId).length;
    return { items, nowPlaying, upcoming, myCount, lastChange, loading, error, reload };
  }, [items, myId, lastChange, loading, error, reload]);
}
