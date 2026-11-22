import { useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useState, useSyncExternalStore } from 'react';

import { claimPlayer, getPlayerOwner, releasePlayer, subscribePlayerOwner } from '@/services/youtube/playerOwner';

/**
 * true si este Modo conductor es el que pone la música. Lo coge al mostrarse y lo mantiene
 * aunque el conductor mire la sala (la música sigue); lo pierde si se abre otro Modo conductor.
 */
export function usePlayerOwnership(): boolean {
  const [id] = useState(() => Symbol('modo-conductor'));

  useFocusEffect(
    useCallback(() => {
      claimPlayer(id);
    }, [id]),
  );
  useEffect(() => () => releasePlayer(id), [id]);

  const owner = useSyncExternalStore(subscribePlayerOwner, getPlayerOwner, getPlayerOwner);
  return owner === id;
}
