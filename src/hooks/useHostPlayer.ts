import { useCallback, useEffect, useRef, useState } from 'react';

import { errorMessage } from '@/lib/errors';
import { isPlayable, nextTrack, playerAction, resumeOffsetMs } from '@/lib/queue';
import { markFinished, markPlaying, markSkipped, type QueueRow } from '@/services/supabase/queue';

import { useSession } from './useSession';
import type { YouTubeController } from './useYouTubeController';

/** Cada cuánto se revisa el reproductor (no llama a ningún servicio: solo mira el estado). */
const TICK_MS = 1000;
/** Cada cuánto se avisa a la sala de lo que suena. */
const BROADCAST_MS = 5000;
/** Tras poner una canción, la cola tarda un poco en decir que ya suena (llega por Realtime). */
const START_GRACE_MS = 5000;

type QueueState = { items: QueueRow[]; nowPlaying: QueueRow | null; lastChange: QueueRow | null };

export type HostPlayerState = {
  error: string | null;
};

/**
 * Reproductor de la cola en el Modo conductor (S2-06, con YouTube desde #57). Solo se monta en el
 * móvil del conductor: pone las canciones en orden en el reproductor de YouTube de la pantalla,
 * marca cada una como sonando o terminada y avisa a la sala de lo que suena.
 */
export function useHostPlayer(queue: QueueState, player: YouTubeController, enabled: boolean): HostPlayerState {
  const { send } = useSession();
  const [error, setError] = useState<string | null>(null);

  const queueRef = useRef(queue);
  const busyRef = useRef(false);
  /** La fila de la cola que está en el reproductor. */
  const loadedRef = useRef<string | null>(null);
  /** La última que se mandó poner, para no ponerla dos veces mientras llega el cambio por Realtime. */
  const startedRef = useRef<{ id: string; at: number } | null>(null);

  useEffect(() => {
    queueRef.current = queue;
  }, [queue]);

  const playNext = useCallback(async () => {
    const next = nextTrack(queueRef.current.items);
    if (next === null) {
      // Se acabó la cola: la música para hasta que alguien añada otra.
      if (player.snapshot().state === 'playing') player.pause();
      loadedRef.current = null;
      startedRef.current = null;
      return;
    }
    player.load(next.track_id, 0);
    loadedRef.current = next.id;
    startedRef.current = { id: next.id, at: Date.now() };
    await markPlaying(next.id);
  }, [player]);

  const tick = useCallback(() => {
    if (busyRef.current) return;
    busyRef.current = true;
    const run = async () => {
      const { items, nowPlaying, lastChange } = queueRef.current;

      // Las canciones de Spotify que quedaron de las pruebas no se pueden poner: fuera de la cola.
      const stale = items.filter((item) => item.status === 'en_cola' && !isPlayable(item));
      for (const item of stale) await markSkipped(item.id);

      // Recién puesta una canción, se espera a que la cola diga que ya suena.
      const started = startedRef.current;
      if (started && Date.now() - started.at < START_GRACE_MS && nowPlaying?.id !== started.id) return;

      // La que sonaba puede haberse saltado por votación: ya no está en la lista.
      const skipped = lastChange && lastChange.status === 'saltada' && lastChange.id === loadedRef.current ? lastChange : null;
      const current = nowPlaying ?? skipped;
      const hasQueue = items.some((item) => item.status === 'en_cola' && isPlayable(item));
      const action = playerAction({ current, player: player.snapshot(), hasQueue });

      if (action === 'finish_current' && current) {
        await markFinished(current.id);
        await playNext();
      } else if (action === 'play_next') {
        await playNext();
      } else if (action === 'load_current' && current) {
        // El Modo conductor se ha vuelto a abrir con una canción sonando: se sigue por donde iría.
        const offset = resumeOffsetMs(current.started_at, current.duration_ms, Date.now());
        if (offset === null) {
          await markFinished(current.id);
          await playNext();
        } else {
          player.load(current.track_id, offset / 1000);
          loadedRef.current = current.id;
        }
      }
    };
    run()
      .then(() => setError(null))
      .catch((err: unknown) => setError(errorMessage(err, 'No se ha podido avanzar la cola.')))
      .finally(() => {
        busyRef.current = false;
      });
  }, [player, playNext]);

  // Bucle del reproductor.
  useEffect(() => {
    if (!enabled) return;
    const timer = setInterval(tick, TICK_MS);
    return () => clearInterval(timer);
  }, [enabled, tick]);

  // Aviso a la sala de lo que suena (la barra de progreso de Música).
  useEffect(() => {
    if (!enabled) return;
    const timer = setInterval(() => {
      const snapshot = player.snapshot();
      send('ahora_suena', {
        queueId: queueRef.current.nowPlaying?.id ?? null,
        progressMs: snapshot.progressMs,
        durationMs: snapshot.durationMs,
        isPlaying: snapshot.state === 'playing',
      });
    }, BROADCAST_MS);
    return () => clearInterval(timer);
  }, [enabled, send, player]);

  return { error };
}
