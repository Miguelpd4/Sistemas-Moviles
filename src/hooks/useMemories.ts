import { useCallback, useEffect, useState } from 'react';

import { errorMessage } from '@/lib/errors';
import { addMemory, getAllMyMemories, getMemories, removeMemory, type Memory } from '@/services/supabase/memories';

/**
 * Fotos del muro de recuerdos (#34): las de un viaje (`sessionId`) o, con `'todas'`, las de todos
 * mis viajes. Se recargan al subir o borrar una.
 */
export function useMemories(sessionId: string | 'todas' | null, userId: string | null) {
  const [loaded, setLoaded] = useState<{ key: string; list: Memory[] } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [version, setVersion] = useState(0);
  const key = sessionId === null ? null : `${sessionId}:${version}`;

  useEffect(() => {
    if (sessionId === null || key === null) return;
    let active = true;
    (sessionId === 'todas' ? getAllMyMemories() : getMemories(sessionId))
      .then((list) => {
        if (!active) return;
        setLoaded({ key, list });
        setError(null);
      })
      .catch((err: unknown) => active && setError(errorMessage(err, 'No se han podido cargar las fotos.')));
    return () => {
      active = false;
    };
  }, [sessionId, key]);

  const reload = useCallback(() => setVersion((n) => n + 1), []);

  const add = useCallback(
    async (uri: string, caption: string | null) => {
      if (sessionId === null || sessionId === 'todas' || userId === null) return false;
      setBusy(true);
      setError(null);
      try {
        await addMemory(sessionId, userId, uri, caption);
        reload();
        return true;
      } catch (err) {
        setError(errorMessage(err));
        return false;
      } finally {
        setBusy(false);
      }
    },
    [sessionId, userId, reload],
  );

  const remove = useCallback(
    async (memory: Memory) => {
      setBusy(true);
      setError(null);
      try {
        await removeMemory(memory);
        reload();
      } catch (err) {
        setError(errorMessage(err));
      } finally {
        setBusy(false);
      }
    },
    [reload],
  );

  // Mientras recarga se siguen viendo las de antes (si son del mismo viaje).
  const current = loaded !== null && sessionId !== null && loaded.key.startsWith(`${sessionId}:`) ? loaded.list : null;
  return { memories: current, error, busy, add, remove, reload };
}
