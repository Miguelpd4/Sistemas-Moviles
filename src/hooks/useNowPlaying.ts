import { useEffect, useState } from 'react';

import { useNow } from './useNow';
import { useSession } from './useSession';

type Snapshot = { queueId: string | null; progressMs: number; durationMs: number; isPlaying: boolean; at: number };

/**
 * Por dónde va la canción que suena, con el aviso «ahora_suena» que manda el móvil del conductor
 * cada 5 s; entre dos avisos, la barra avanza sola.
 */
export function useNowPlaying(queueId: string | null, fallbackDurationMs: number) {
  const { on } = useSession();
  const [snapshot, setSnapshot] = useState<Snapshot | null>(null);
  const now = useNow(1000);

  useEffect(() => on('ahora_suena', (event) => setSnapshot({ ...event, at: Date.now() })), [on]);

  const current = snapshot && snapshot.queueId === queueId ? snapshot : null;
  const durationMs = current?.durationMs || fallbackDurationMs;
  const elapsed = current ? current.progressMs + (current.isPlaying ? now - current.at : 0) : 0;
  const progressMs = Math.min(durationMs, Math.max(0, elapsed));
  return { progressMs, durationMs, isPlaying: current?.isPlaying ?? false, known: current !== null };
}
