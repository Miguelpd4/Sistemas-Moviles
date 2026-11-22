import { useCallback, useMemo, useRef, useState, type RefObject } from 'react';

import type { YouTubePlayerHandle } from '@/components/musica/YouTubePlayer';
import { IDLE_PLAYER, type PlayerSnapshot, type PlayerState } from '@/lib/queue';
import { playerErrorMessage } from '@/lib/youtube';
import type { YouTubePlayerEvent } from '@/types/youtube';

export type YouTubeController = {
  /** Para el `ref` del <YouTubePlayer> del Modo conductor. */
  playerRef: RefObject<YouTubePlayerHandle | null>;
  /** Para el `onEvent` del <YouTubePlayer>. */
  onEvent: (event: YouTubePlayerEvent) => void;
  /** Lo último que se sabe del reproductor (sin volver a pintar la pantalla cada segundo). */
  snapshot: () => PlayerSnapshot;
  load: (videoId: string, startSeconds: number) => void;
  play: () => void;
  pause: () => void;
  /** Estado para la pantalla (cambia poco: no incluye el progreso). */
  state: PlayerState;
  /** Último error del reproductor (vídeo que no deja reproducirse, etc.). */
  error: string | null;
};

/**
 * Mando del reproductor de YouTube del Modo conductor (#57). Lo usan la cola (`useHostPlayer`) y
 * «Adivina la canción» (`useSongQuizHost`), que comparten el mismo reproductor.
 */
export function useYouTubeController(): YouTubeController {
  const playerRef = useRef<YouTubePlayerHandle | null>(null);
  const snapshotRef = useRef<PlayerSnapshot>(IDLE_PLAYER);
  const [state, setState] = useState<PlayerState>('unstarted');
  const [error, setError] = useState<string | null>(null);

  const update = useCallback((patch: Partial<PlayerSnapshot>) => {
    const next = { ...snapshotRef.current, ...patch };
    snapshotRef.current = next;
    setState(next.state);
  }, []);

  const onEvent = useCallback(
    (event: YouTubePlayerEvent) => {
      if (event.type === 'progress') {
        snapshotRef.current = { ...snapshotRef.current, progressMs: event.currentMs, durationMs: event.durationMs };
      } else if (event.type === 'state') {
        update({ state: event.state });
        if (event.state === 'playing') setError(null);
      } else if (event.type === 'error') {
        update({ state: 'error' });
        setError(event.code === -1 ? 'No se ha podido cargar el reproductor de YouTube. Revisa la conexión.' : playerErrorMessage(event.code));
      }
    },
    [update],
  );

  const load = useCallback(
    (videoId: string, startSeconds: number) => {
      // Hasta que YouTube diga otra cosa, «cargando»: así no se toma el «terminado» del vídeo anterior.
      update({ videoId, state: 'loading', progressMs: Math.round(startSeconds * 1000), durationMs: 0 });
      playerRef.current?.send({ type: 'load', videoId, startSeconds: Math.max(0, Math.floor(startSeconds)) });
    },
    [update],
  );
  const play = useCallback(() => playerRef.current?.send({ type: 'play' }), []);
  const pause = useCallback(() => playerRef.current?.send({ type: 'pause' }), []);
  const snapshot = useCallback(() => snapshotRef.current, []);

  return useMemo(
    () => ({ playerRef, onEvent, snapshot, load, play, pause, state, error }),
    [onEvent, snapshot, load, play, pause, state, error],
  );
}
