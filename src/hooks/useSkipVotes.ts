import { useEffect, useState } from 'react';

import { getVotes } from '@/services/supabase/queue';

import { useSession } from './useSession';

/** Votos para saltar la canción que suena (S2-07). */
export function useSkipVotes(queueId: string | null) {
  const { on, myId } = useSession();
  const [voters, setVoters] = useState<ReadonlySet<string>>(new Set());

  useEffect(() => {
    setVoters(new Set());
    if (queueId === null) return;
    let active = true;
    getVotes(queueId)
      .then((ids) => active && setVoters(new Set(ids)))
      .catch(() => undefined);
    const off = on('vote', (change) => {
      const row = change.new;
      if (row.queue_id !== queueId || !row.user_id) return;
      const userId = row.user_id;
      setVoters((current) => (current.has(userId) ? current : new Set([...current, userId])));
    });
    return () => {
      active = false;
      off();
    };
  }, [queueId, on]);

  const addMine = () => {
    if (myId !== null) setVoters((current) => new Set([...current, myId]));
  };
  return { votes: voters.size, voted: myId !== null && voters.has(myId), addMine };
}
