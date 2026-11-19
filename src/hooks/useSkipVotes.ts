import { useEffect, useState } from 'react';

import { getVotes } from '@/services/supabase/queue';

import { useSession } from './useSession';

type Votes = { queueId: string | null; voters: ReadonlySet<string> };

const NO_VOTES: Votes = { queueId: null, voters: new Set() };

/** Añade un voto a la canción `queueId` (si ha cambiado la canción, empieza de cero). */
function addVoter(current: Votes, queueId: string, userId: string): Votes {
  if (current.queueId !== queueId) return { queueId, voters: new Set([userId]) };
  return current.voters.has(userId) ? current : { queueId, voters: new Set([...current.voters, userId]) };
}

/**
 * Votos para saltar la canción que suena (S2-07). Los votos van con el id de su canción: al
 * cambiar de canción se descartan solos.
 */
export function useSkipVotes(queueId: string | null) {
  const { on, myId } = useSession();
  const [state, setState] = useState<Votes>(NO_VOTES);

  useEffect(() => {
    if (queueId === null) return;
    let active = true;
    getVotes(queueId)
      .then((ids) => {
        if (!active) return;
        // Se suman a los que hayan llegado por el canal mientras tanto.
        setState((current) => ({ queueId, voters: new Set([...(current.queueId === queueId ? current.voters : []), ...ids]) }));
      })
      .catch(() => undefined);
    const off = on('vote', (change) => {
      const row = change.new;
      if (row.queue_id !== queueId || !row.user_id) return;
      const userId = row.user_id;
      setState((current) => addVoter(current, queueId, userId));
    });
    return () => {
      active = false;
      off();
    };
  }, [queueId, on]);

  const voters = state.queueId === queueId ? state.voters : NO_VOTES.voters;
  const addMine = () => {
    if (myId !== null && queueId !== null) setState((current) => addVoter(current, queueId, myId));
  };
  return { votes: voters.size, voted: myId !== null && voters.has(myId), addMine };
}
