import { useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';

import { errorMessage } from '@/lib/errors';
import { buildHistory, historyTotals } from '@/lib/history';
import { getHistory, type HistoryData } from '@/services/supabase/history';

/** Historial (#34): mis viajes terminados y los totales. Se recarga al volver a la pestaña o al tirar hacia abajo. */
export function useHistory(userId: string | null) {
  const [loaded, setLoaded] = useState<{ userId: string; data: HistoryData } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [version, setVersion] = useState(0);
  const [refreshing, setRefreshing] = useState(false);

  useFocusEffect(
    useCallback(() => {
      setVersion((n) => n + 1);
    }, []),
  );

  useEffect(() => {
    if (userId === null || version === 0) return;
    let active = true;
    getHistory(userId)
      .then((data) => {
        if (!active) return;
        setLoaded({ userId, data });
        setError(null);
      })
      .catch((err: unknown) => active && setError(errorMessage(err, 'No se ha podido cargar tu historial.')))
      .finally(() => active && setRefreshing(false));
    return () => {
      active = false;
    };
  }, [userId, version]);

  const current = loaded !== null && loaded.userId === userId ? loaded.data : null;
  const trips = useMemo(() => (current && userId ? buildHistory({ myId: userId, ...current }) : null), [current, userId]);
  const totals = useMemo(() => (trips ? historyTotals(trips) : null), [trips]);

  const refresh = useCallback(() => {
    setRefreshing(true);
    setVersion((n) => n + 1);
  }, []);

  return { trips, totals, error, refreshing, refresh };
}
