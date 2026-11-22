import { useEffect, useState } from 'react';

import { errorMessage } from '@/lib/errors';
import { getTripMoney, type Expense, type Payment } from '@/services/supabase/payments';

type Loaded = { sessionId: string; expenses: Expense[]; payments: Payment[] };

/** Gastos y pagos del viaje (#25). Solo se piden cuando `ready` (el viaje ya ha terminado). */
export function useTripMoney(sessionId: string | null, ready: boolean) {
  const [loaded, setLoaded] = useState<Loaded | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!ready || sessionId === null) return;
    let active = true;
    getTripMoney(sessionId)
      .then((data) => {
        if (!active) return;
        setLoaded({ sessionId, ...data });
        setError(null);
      })
      .catch((err: unknown) => active && setError(errorMessage(err, 'No se ha podido cargar el reparto.')));
    return () => {
      active = false;
    };
  }, [sessionId, ready]);

  const current = loaded !== null && loaded.sessionId === sessionId ? loaded : null;
  return { expenses: current?.expenses ?? null, payments: current?.payments ?? null, error };
}
