import { useEffect, useMemo, useState } from 'react';

import { errorMessage } from '@/lib/errors';
import { buildWrapped, type MusicEntry } from '@/lib/wrapped';
import { getTripMusic } from '@/services/supabase/queue';

/** COPI Wrapped (#35) de un viaje: su música y las estadísticas calculadas. */
export function useTripWrapped(sessionId: string | null) {
  const [loaded, setLoaded] = useState<{ sessionId: string; entries: MusicEntry[] } | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (sessionId === null) return;
    let active = true;
    getTripMusic(sessionId)
      .then((entries) => {
        if (!active) return;
        setLoaded({ sessionId, entries });
        setError(null);
      })
      .catch((err: unknown) => active && setError(errorMessage(err, 'No se ha podido cargar la música del viaje.')));
    return () => {
      active = false;
    };
  }, [sessionId]);

  const wrapped = useMemo(
    () => (loaded !== null && sessionId !== null && loaded.sessionId === sessionId ? buildWrapped(loaded.entries, sessionId) : null),
    [loaded, sessionId],
  );
  return { wrapped, error };
}
