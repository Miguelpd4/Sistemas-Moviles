import { useEffect, useState } from 'react';

import { errorMessage } from '@/lib/errors';
import { watchMyPosition, type Fix } from '@/services/location/watch';

/** #29 · Ubicación de este móvil en directo mientras la pantalla está abierta. */
export function useMyLocation(enabled = true): { position: Fix | null; error: string | null } {
  const [position, setPosition] = useState<Fix | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!enabled) return;
    let active = true;
    let stop: (() => void) | null = null;
    watchMyPosition(
      (fix) => {
        if (!active) return;
        setPosition(fix);
        setError(null);
      },
      (message) => active && setError(message),
    )
      .then((unsubscribe) => {
        if (active) stop = unsubscribe;
        else unsubscribe();
      })
      .catch((err: unknown) => active && setError(errorMessage(err, 'No se ha podido saber dónde estás.')));
    return () => {
      active = false;
      stop?.();
    };
  }, [enabled]);

  return { position: enabled ? position : null, error: enabled ? error : null };
}
