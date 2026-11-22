import { useEffect, useMemo, useState } from 'react';

import { errorMessage } from '@/lib/errors';
import type { HistoryTrip } from '@/lib/history';
import { buildStats, type GameAnswerLite, type SongLite } from '@/lib/stats';
import { getMyGamesAndSongs } from '@/services/supabase/stats';

/** Estadísticas del Perfil (#34): las del historial más juegos y música. */
export function useStats(userId: string | null, trips: readonly HistoryTrip[] | null) {
  const [extra, setExtra] = useState<{ userId: string; answers: GameAnswerLite[]; songs: SongLite[] } | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (userId === null) return;
    let active = true;
    getMyGamesAndSongs(userId)
      .then((data) => {
        if (!active) return;
        setExtra({ userId, ...data });
        setError(null);
      })
      .catch((err: unknown) => active && setError(errorMessage(err, 'No se han podido cargar tus estadísticas.')));
    return () => {
      active = false;
    };
  }, [userId, trips]);

  const current = extra !== null && extra.userId === userId ? extra : null;
  const stats = useMemo(() => (trips && current ? buildStats(trips, current.answers, current.songs) : null), [trips, current]);
  return { stats, error };
}
