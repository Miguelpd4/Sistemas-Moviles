import { useCallback, useEffect, useRef, useState } from 'react';

import { RESUME_GRACE_MS, readSongClip, resumePlan } from '@/lib/games/adivinaCancion';
import { AppError, errorMessage } from '@/lib/errors';
import { getCurrentlyPlaying, pause, playTrack } from '@/services/spotify/player';
import { getRounds, getSongClip, type RoundRow } from '@/services/supabase/games';

import { useSession } from './useSession';

const wait = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

const isLiveQuiz = (round: RoundRow) =>
  round.game === 'adivina_cancion' && round.status === 'activa' && (round.ends_at === null || new Date(round.ends_at).getTime() > Date.now());

export type SongQuizHostState = {
  /** Suena (o acaba de sonar) un fragmento: el reproductor de la cola debe esperar. */
  playing: boolean;
  error: string | null;
};

/**
 * «Adivina la canción» en el móvil del conductor (#21). Cuando alguien empieza una ronda, pide el
 * fragmento (solo el conductor puede), pone esa canción 10 s desde el segundo elegido y vuelve a
 * la canción de la cola por donde iba. Mientras tanto, `playing` para el reproductor de la cola.
 */
export function useSongQuizHost(enabled: boolean): SongQuizHostState {
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
      const before = await getCurrentlyPlaying().catch(() => null);
      await playTrack(clip.trackId, clip.positionMs);
      await wait(clip.clipMs);
      if (!mountedRef.current) return;
      const plan = resumePlan(before);
      if (plan.kind === 'resume') await playTrack(plan.trackId, plan.positionMs);
      else await pause();
      // Spotify tarda en decir que ya suena la canción de la cola: el reproductor espera un poco más.
      await wait(RESUME_GRACE_MS);
    } catch (err) {
      // Si la ronda ya se cerró, no hay nada que poner: no es un error para el conductor.
      if (!(err instanceof AppError && err.code === 'ROUND_CLOSED')) {
        setError(errorMessage(err, 'No se ha podido poner el fragmento.'));
      }
    } finally {
      if (mountedRef.current) setPlaying(false);
    }
  }, []);

  // Rondas nuevas por el canal de la sala.
  useEffect(() => {
    if (!enabled) return;
    return on('round', (change) => {
      const row = change.new as RoundRow;
      if (row.id && row.session_id === sessionId && isLiveQuiz(row)) void playClip(row.id);
    });
  }, [enabled, on, sessionId, playClip]);

  // Por si la ronda empezó justo antes de abrir el Modo conductor o de conectar Spotify.
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
