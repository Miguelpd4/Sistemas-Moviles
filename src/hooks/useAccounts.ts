import { useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';

import { errorMessage } from '@/lib/errors';
import { getMyPayments, getNames, getPayees, getTripDates, markPaymentPaid, type Payee, type Payment } from '@/services/supabase/payments';

type Loaded = {
  userId: string;
  payments: Payment[];
  names: Record<string, string>;
  payees: Record<string, Payee>;
  dates: Record<string, string>;
};

/** Cuentas (#28): mis pagos de todos los viajes, con nombres, fechas y cómo pagar. Se recarga al volver a la pestaña. */
export function useAccounts(userId: string | null) {
  const [loaded, setLoaded] = useState<Loaded | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [version, setVersion] = useState(0);

  useFocusEffect(
    useCallback(() => {
      setVersion((n) => n + 1);
    }, []),
  );

  useEffect(() => {
    if (userId === null || version === 0) return;
    let active = true;
    getMyPayments(userId)
      .then(async (payments) => {
        const people = [...new Set(payments.flatMap((p) => [p.from_user, p.to_user]))].filter((id) => id !== userId);
        const [names, payees, dates] = await Promise.all([
          getNames(people),
          getPayees([...new Set(payments.filter((p) => p.from_user === userId).map((p) => p.to_user))]),
          getTripDates([...new Set(payments.map((p) => p.session_id))]),
        ]);
        if (!active) return;
        setLoaded({ userId, payments, names, payees, dates });
        setError(null);
      })
      .catch((err: unknown) => active && setError(errorMessage(err, 'No se han podido cargar tus cuentas.')));
    return () => {
      active = false;
    };
  }, [userId, version]);

  const markPaid = useCallback(async (paymentId: string) => {
    try {
      await markPaymentPaid(paymentId);
      setError(null);
    } catch (err) {
      setError(errorMessage(err, 'No se ha podido marcar el pago.'));
    }
    setVersion((n) => n + 1);
  }, []);

  const current = loaded !== null && loaded.userId === userId ? loaded : null;
  return { data: current, error, markPaid };
}
