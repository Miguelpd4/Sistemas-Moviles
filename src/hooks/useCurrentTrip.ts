import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';

import { useAuth } from '@/hooks/useAuth';
import { getCurrentTrip, type CurrentTrip } from '@/services/supabase/sessions';

/** El viaje no finalizado del usuario, si lo hay. Se recarga cada vez que la pantalla vuelve a verse. */
export function useCurrentTrip() {
  const { user } = useAuth();
  const userId = user?.id ?? null;
  const [trip, setTrip] = useState<CurrentTrip | null>(null);
  const [loading, setLoading] = useState(false);

  const reload = useCallback(async () => {
    if (userId === null) {
      setTrip(null);
      return null;
    }
    setLoading(true);
    try {
      const current = await getCurrentTrip(userId);
      setTrip(current);
      return current;
    } catch {
      // Sin red: se deja la última información conocida.
      return null;
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useFocusEffect(
    useCallback(() => {
      void reload();
    }, [reload]),
  );

  return { trip, loading, reload };
}
