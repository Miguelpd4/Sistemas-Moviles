import { useCallback, useEffect, useState } from 'react';

import { errorMessage } from '@/lib/errors';
import { getPayees, getTripMoney, markPaymentPaid, type Expense, type Payee, type Payment } from '@/services/supabase/payments';

type Loaded = { sessionId: string; expenses: Expense[]; payments: Payment[]; payees: Record<string, Payee> };

/**
 * Gastos y pagos del viaje (#25) y cómo pagar a cada uno (#27). Solo se piden cuando `ready`.
 * Durante el viaje hay gastos extra (#26) pero aún no pagos. `markPaid` y `reload` vuelven a cargar.
 */
export function useTripMoney(sessionId: string | null, ready: boolean) {
  const [loaded, setLoaded] = useState<Loaded | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [version, setVersion] = useState(0);

  useEffect(() => {
    if (!ready || sessionId === null) return;
    let active = true;
    getTripMoney(sessionId)
      .then(async (data) => {
        const payees = await getPayees([...new Set(data.payments.map((p) => p.to_user))]);
        if (!active) return;
        setLoaded({ sessionId, ...data, payees });
        setError(null);
      })
      .catch((err: unknown) => active && setError(errorMessage(err, 'No se ha podido cargar el reparto.')));
    return () => {
      active = false;
    };
  }, [sessionId, ready, version]);

  const markPaid = useCallback(async (paymentId: string) => {
    try {
      await markPaymentPaid(paymentId);
      setError(null);
    } catch (err) {
      setError(errorMessage(err, 'No se ha podido marcar el pago.'));
    }
    setVersion((n) => n + 1);
  }, []);

  const current = loaded !== null && loaded.sessionId === sessionId ? loaded : null;
  return {
    expenses: current?.expenses ?? null,
    payments: current?.payments ?? null,
    payees: current?.payees ?? {},
    error,
    markPaid,
    reload: () => setVersion((n) => n + 1),
  };
}
