import { useCallback, useEffect, useMemo, useState } from 'react';

import { errorMessage } from '@/lib/errors';
import { getAnswers, getRounds, type AnswerRow, type RoundRow } from '@/services/supabase/games';

import { useSession } from './useSession';

/** Juegos musicales: van por su cuenta y no ocupan la pantalla de Juegos. */
const MUSIC_GAMES = new Set(['dj', 'quien_la_puso']);

/**
 * La ronda de juego en pantalla (S2-09): la activa o revelada más reciente, quién ha respondido
 * (por Broadcast) y, una vez revelada, todas las respuestas.
 */
export function useActiveRound() {
  const { sessionId, on, myId } = useSession();
  const [rounds, setRounds] = useState<RoundRow[]>([]);
  const [answeredBy, setAnsweredBy] = useState<ReadonlySet<string>>(new Set());
  const [answers, setAnswers] = useState<AnswerRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    try {
      setRounds(await getRounds(sessionId));
      setError(null);
    } catch (err) {
      setError(errorMessage(err, 'No se han podido cargar los juegos.'));
    } finally {
      setLoading(false);
    }
  }, [sessionId]);

  useEffect(() => {
    void reload();
  }, [reload]);

  useEffect(
    () =>
      on('round', (change) => {
        const row = change.new as RoundRow;
        if (!row.id || row.session_id !== sessionId) return;
        setRounds((list) => [row, ...list.filter((item) => item.id !== row.id)].sort((a, b) => b.created_at.localeCompare(a.created_at)));
      }),
    [on, sessionId],
  );
  useEffect(() => on('status', (status) => status === 'conectado' && void reload()), [on, reload]);

  const round = useMemo(
    () => rounds.find((item) => !MUSIC_GAMES.has(item.game) && (item.status === 'activa' || item.status === 'revelada')) ?? null,
    [rounds],
  );
  const roundId = round?.id ?? null;
  const roundStatus = round?.status ?? null;

  // Quién ha respondido a la ronda activa.
  useEffect(() => {
    setAnsweredBy(new Set());
    if (roundId === null) return;
    return on('ronda', (event) => {
      if (event.roundId !== roundId) return;
      setAnsweredBy((current) => (current.has(event.userId) ? current : new Set([...current, event.userId])));
    });
  }, [on, roundId]);

  // Respuestas: con la ronda activa, solo la mía; revelada, todas.
  useEffect(() => {
    setAnswers([]);
    if (roundId === null) return;
    let active = true;
    getAnswers(roundId)
      .then((rows) => {
        if (!active) return;
        setAnswers(rows);
        if (rows.some((row) => row.user_id === myId) && myId !== null) {
          setAnsweredBy((current) => new Set([...current, myId]));
        }
      })
      .catch(() => undefined);
    return () => {
      active = false;
    };
  }, [roundId, roundStatus, myId]);

  const usedQuestionIds = useMemo(
    () =>
      rounds
        .filter((item) => item.game === 'probable')
        .map((item) => {
          const payload = item.payload as { questionId?: unknown } | null;
          return typeof payload?.questionId === 'string' ? payload.questionId : null;
        })
        .filter((id): id is string => id !== null),
    [rounds],
  );

  const myAnswer = answers.find((row) => row.user_id === myId) ?? null;

  return {
    round,
    answers,
    myAnswer,
    answeredBy,
    usedQuestionIds,
    loading,
    error,
    reload,
    markAnswered: (userId: string) => setAnsweredBy((current) => new Set([...current, userId])),
    setMyAnswerLocal: (row: AnswerRow) => setAnswers((list) => [...list.filter((item) => item.user_id !== row.user_id), row]),
  };
}
