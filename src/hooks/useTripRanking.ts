import { useEffect, useMemo, useState } from 'react';

import { errorMessage } from '@/lib/errors';
import { rankStandings, type RankingRow } from '@/lib/ranking';
import { getTripRanking } from '@/services/supabase/games';

/**
 * Clasificación general de un viaje (#33). Se vuelve a pedir cuando cambia `refreshKey` (por
 * ejemplo, al revelarse una ronda). Mientras recarga se sigue viendo la anterior.
 */
export function useTripRanking(sessionId: string | null, refreshKey = 0) {
  const [loaded, setLoaded] = useState<{ sessionId: string; rows: RankingRow[] } | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (sessionId === null) return;
    let active = true;
    getTripRanking(sessionId)
      .then((rows) => {
        if (!active) return;
        setLoaded({ sessionId, rows });
        setError(null);
      })
      .catch((err: unknown) => active && setError(errorMessage(err, 'No se ha podido cargar la clasificación.')));
    return () => {
      active = false;
    };
  }, [sessionId, refreshKey]);

  const rows = loaded !== null && loaded.sessionId === sessionId ? loaded.rows : null;
  const standings = useMemo(() => (rows ? rankStandings(rows) : null), [rows]);
  return { standings, error };
}
