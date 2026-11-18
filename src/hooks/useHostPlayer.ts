import { useCallback, useEffect, useRef, useState } from 'react';

import { AppError, errorMessage } from '@/lib/errors';
import { nextTrack, playerAction, type SpotifySnapshot } from '@/lib/queue';
import { markFinished, markPlaying, type QueueRow } from '@/services/supabase/queue';
import { getCurrentlyPlaying, pause, playTrack } from '@/services/spotify/player';

import { useSession } from './useSession';

/** Cada cuánto se mira Spotify. */
const TICK_MS = 3000;
/** Cada cuánto se avisa a la sala de lo que suena. */
const BROADCAST_MS = 5000;
/** Tras pedir una canción, Spotify tarda un poco en decir que ya suena. */
const START_GRACE_MS = 4000;

type QueueState = { items: QueueRow[]; nowPlaying: QueueRow | null; lastChange: QueueRow | null };

export type HostPlayerState = {
  spotify: SpotifySnapshot | null;
  error: string | null;
  /** Hace falta abrir Spotify en el móvil. */
  needsDevice: boolean;
};

/**
 * Reproductor del conductor (S2-06). Solo se monta en el Modo conductor, en el móvil del
 * conductor y con Spotify conectado: hace sonar la cola en orden, marca cada canción como
 * sonando o terminada y avisa a la sala de lo que suena.
 */
export function useHostPlayer(queue: QueueState, enabled: boolean): HostPlayerState {
  const { send } = useSession();
  const [spotify, setSpotify] = useState<SpotifySnapshot | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [needsDevice, setNeedsDevice] = useState(false);

  const queueRef = useRef(queue);
  const busyRef = useRef(false);
  const startedRef = useRef<{ id: string; at: number } | null>(null);
  const spotifyRef = useRef<SpotifySnapshot | null>(null);

  useEffect(() => {
    queueRef.current = queue;
  }, [queue]);

  const handleError = useCallback((err: unknown) => {
    setNeedsDevice(err instanceof AppError && err.code === 'NO_ACTIVE_DEVICE');
    setError(errorMessage(err, 'No se ha podido controlar Spotify.'));
  }, []);

  const playNext = useCallback(async () => {
    const next = nextTrack(queueRef.current.items);
    if (next === null) {
      // Se acabó la cola: se para la música hasta que alguien añada otra.
      if (spotifyRef.current?.isPlaying) await pause().catch(() => undefined);
      startedRef.current = null;
      return;
    }
    await playTrack(next.spotify_track_id);
    startedRef.current = { id: next.id, at: Date.now() };
    await markPlaying(next.id);
  }, []);

  const tick = useCallback(async () => {
    if (busyRef.current) return;
    busyRef.current = true;
    try {
      const snapshot = await getCurrentlyPlaying();
      spotifyRef.current = snapshot;
      setSpotify(snapshot);

      const { items, nowPlaying, lastChange } = queueRef.current;
      // La que sonaba puede haberse saltado por votación: ya no está en la lista.
      const skipped = lastChange && lastChange.status === 'saltada' && lastChange.id === startedRef.current?.id ? lastChange : null;
      const current = nowPlaying ?? skipped;
      const hasQueue = items.some((item) => item.status === 'en_cola');
      let action = playerAction({ current, spotify: snapshot, hasQueue });

      // Recién pedida, Spotify aún puede decir la canción anterior.
      const started = startedRef.current;
      if (action === 'finish_current' && started && started.id === current?.id && Date.now() - started.at < START_GRACE_MS) {
        action = 'wait';
      }

      if (action === 'finish_current' && current) {
        await markFinished(current.id);
        await playNext();
      } else if (action === 'play_next') {
        await playNext();
      }
      setError(null);
      setNeedsDevice(false);
    } catch (err) {
      handleError(err);
    } finally {
      busyRef.current = false;
    }
  }, [playNext, handleError]);

  // Bucle del reproductor.
  useEffect(() => {
    if (!enabled) return;
    void tick();
    const timer = setInterval(() => void tick(), TICK_MS);
    return () => clearInterval(timer);
  }, [enabled, tick]);

  // Si se salta la canción por votación, se actúa enseguida.
  const skippedId = queue.lastChange?.status === 'saltada' ? queue.lastChange.id : null;
  useEffect(() => {
    if (enabled && skippedId !== null) void tick();
  }, [enabled, skippedId, tick]);

  // Con la cola parada, en cuanto alguien añade una canción empieza a sonar.
  const queued = queue.items.filter((item) => item.status === 'en_cola').length;
  const idle = queue.nowPlaying === null;
  useEffect(() => {
    if (enabled && idle && queued > 0) void tick();
  }, [enabled, idle, queued, tick]);

  // Aviso a la sala de lo que suena.
  useEffect(() => {
    if (!enabled) return;
    const timer = setInterval(() => {
      const snapshot = spotifyRef.current;
      send('ahora_suena', {
        queueId: queueRef.current.nowPlaying?.id ?? null,
        progressMs: snapshot?.progressMs ?? 0,
        durationMs: snapshot?.durationMs ?? 0,
        isPlaying: snapshot?.isPlaying ?? false,
      });
    }, BROADCAST_MS);
    return () => clearInterval(timer);
  }, [enabled, send]);

  return { spotify, error, needsDevice };
}
