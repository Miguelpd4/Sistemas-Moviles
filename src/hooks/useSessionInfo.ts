import { useEffect, useState } from 'react';

import { errorMessage } from '@/lib/errors';
import { getSessionWithCar, type SessionWithCar } from '@/services/supabase/sessions';

/** Datos del viaje y de su coche (nombre, código de pegatina y plazas). */
export function useSessionInfo(sessionId: string | null) {
  const [session, setSession] = useState<SessionWithCar | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (sessionId === null) return;
    let active = true;
    setError(null);
    getSessionWithCar(sessionId)
      .then((value) => {
        if (active) setSession(value);
      })
      .catch((err: unknown) => {
        if (active) setError(errorMessage(err, 'No se ha podido cargar el viaje.'));
      });
    return () => {
      active = false;
    };
  }, [sessionId]);

  return { session, error };
}
