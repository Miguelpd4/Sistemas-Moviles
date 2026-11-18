import { useEffect, useState } from 'react';

import { getTripMetrics, type TripMetrics } from '@/services/supabase/trip';

import { useSession } from './useSession';

/** Distancia y posición del viaje en vivo (S2-08). */
export function useTripMetrics() {
  const { sessionId, on, session } = useSession();
  const [metrics, setMetrics] = useState<TripMetrics | null>(null);
  const status = session?.status;

  useEffect(() => {
    let active = true;
    getTripMetrics(sessionId)
      .then((row) => active && setMetrics(row))
      .catch(() => undefined);
    return () => {
      active = false;
    };
    // Se recarga al empezar o terminar el viaje.
  }, [sessionId, status]);

  useEffect(
    () =>
      on('metrics', (row) => {
        if (row.session_id !== sessionId) return;
        setMetrics((current) => ({ ...(current ?? ({} as TripMetrics)), ...row }) as TripMetrics);
      }),
    [on, sessionId],
  );

  return metrics;
}
