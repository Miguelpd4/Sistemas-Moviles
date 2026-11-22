import { useCallback, useEffect, useRef, useState } from 'react';

import { RESUME_GRACE_MS, readSongClip, resumePlan } from '@/lib/games/adivinaCancion';
import { AppError, errorMessage } from '@/lib/errors';
import { getRounds, getSongClip, type RoundRow } from '@/services/supabase/games';

import { useSession } from './useSession';
import type { YouTubeController } from './useYouTubeController';

const wait = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

/** Lo que tarda como mucho YouTube en empezar a sonar un vídeo recién puesto. */
const START_TIMEOUT_MS = 6000;

/** Espera a que el reproductor diga que suena (o a que pase `timeout`). */
async function waitUntilPlaying(player: YouTubeController, timeout: number): Promise<void> {
  const until = Date.now() + timeout;
  while (Date.now() < until) {
    const { state } = player.snapshot();
    if (state === 'playing' || state === 'error') return;
    await wait(250);
  }
}

const isLiveQuiz = (round: RoundRow) =>
  round.game === 'adivina_cancion' && round.status === 'activa' && (round.ends_at === null || new Date(round.ends_at).getTime() > Date.now());

export type SongQuizHostState = {
  /** Suena (o acaba de sonar) un fragmento: el reproductor de la cola debe esperar. */
  playing: boolean;
  error: string | null;
};

/**
 * «Adivina la canción» en el móvil del conductor (#21, con YouTube desde #57). Cuando alguien
 * empieza una ronda, pide el fragmento (solo el conductor puede), pone esa canción 10 s desde el
 * segundo elegido en el reproductor de YouTube y vuelve a la canción de la cola por donde iba.
 * Mientras tanto, `playing` para el reproductor de la cola.
 */
export function useSongQuizHost(player: YouTubeController, enabled: boolean): SongQuizHostState {
  const { sessionId, on } = useSession();
  const [playing, setPlaying] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const handledRef = useRef(new Set<string>());
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const playClip = useCallback(async (roundId: string) => {
    if (handledRef.current.has(roundId)) return;
    handledRef.current.add(roundId);
    setPlaying(true);
    setError(null);
    try {
      const clip = readSongClip(await getSongClip(roundId));
      if (clip === null) throw new AppError('No se ha podido preparar el fragmento.');
      const now = player.snapshot();
      const before = { trackId: now.videoId, progressMs: now.progressMs, isPlaying: now.state === 'playing' };
      player.load(clip.trackId, clip.positionMs / 1000);
      // Los 10 s cuentan desde que de verdad suena (YouTube tarda un poco en cargar).
      await waitUntilPlaying(player, START_TIMEOUT_MS);
      await wait(clip.clipMs);
      if (!mountedRef.current) return;
      const plan = resumePlan(before);
      if (plan.kind === 'resume') player.load(plan.trackId, plan.positionMs / 1000);
      else player.pause();
      // Mientras vuelve a cargar la canción de la cola, el reproductor de la cola espera un poco.
      await wait(RESUME_GRACE_MS);
    } catch (err) {
      // Si la ronda ya se cerró, no hay nada que poner: no es un error para el conductor.
      if (!(err instanceof AppError && err.code === 'ROUND_CLOSED')) {
        setError(errorMessage(err, 'No se ha podido poner el fragmento.'));
      }
    } finally {
      if (mountedRef.current) setPlaying(false);
    }
  }, [player]);

  // Rondas nuevas por el canal de la sala.
  useEffect(() => {
    if (!enabled) return;
    return on('round', (change) => {
      const row = change.new as RoundRow;
      if (row.id && row.session_id === sessionId && isLiveQuiz(row)) void playClip(row.id);
    });
  }, [enabled, on, sessionId, playClip]);

  // Por si la ronda empezó justo antes de abrir el Modo conductor.
  useEffect(() => {
    if (!enabled) return;
    let active = true;
    getRounds(sessionId)
      .then((rounds) => {
        const live = rounds.find(isLiveQuiz);
        if (active && live) void playClip(live.id);
      })
      .catch(() => undefined);
    return () => {
      active = false;
    };
  }, [enabled, sessionId, playClip]);

  return { playing, error };
}
