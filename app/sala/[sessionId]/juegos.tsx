import Ionicons from '@expo/vector-icons/Ionicons';
import { useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { Countdown } from '@/components/juegos/Countdown';
import { GameLobby } from '@/components/juegos/GameLobby';
import { OptionList, type GameOption } from '@/components/juegos/OptionList';
import { ResultsBars } from '@/components/juegos/ResultsBars';
import { AppText, Badge, Button, Glow, Notice, Screen, ScreenHeader } from '@/components/ui';
import { gameInfo, type GameInfo } from '@/games/registry';
import { useActiveRound } from '@/hooks/useActiveRound';
import { useNow } from '@/hooks/useNow';
import { useSession } from '@/hooks/useSession';
import { errorMessage } from '@/lib/errors';
import { PROBABLE_SECONDS, pickQuestion } from '@/lib/games/probable';
import { tally } from '@/lib/games/tally';
import { vibrate } from '@/services/device/feedback';
import { closeRound, createRound, revealRound, submitAnswer } from '@/services/supabase/games';
import { radius, spacing, useStyles, useTheme, type Palette } from '@/theme';
import type { Json } from '@/types/database';

type ProbablePayload = { questionId?: string; question?: string; options?: GameOption[] };

function readPayload(payload: Json | undefined): ProbablePayload {
  return typeof payload === 'object' && payload !== null && !Array.isArray(payload) ? (payload as ProbablePayload) : {};
}

/**
 * Pestaña Juegos (S2-09): el motor de rondas con «¿Quién es más probable que…?». Todos votan a
 * la vez, nadie ve los votos hasta el final y el resultado aparece en todas las pantallas.
 */
export default function JuegosScreen() {
  const { colors } = useTheme();
  const styles = useStyles(makeStyles);
  const { sessionId, members, myId, isAdmin, send } = useSession();
  const { round, answers, myAnswer, answeredBy, usedQuestionIds, loading, error, markAnswered, setMyAnswerLocal } = useActiveRound();
  const [starting, setStarting] = useState<string | null>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const now = useNow(500);
  const revealedRef = useRef<string | null>(null);

  const payload = readPayload(round?.payload);
  const options = payload.options ?? [];
  const endsAt = round?.ends_at ? new Date(round.ends_at).getTime() : null;
  const secondsLeft = endsAt ? Math.max(0, Math.ceil((endsAt - now) / 1000)) : 0;
  const active = round?.status === 'activa';
  const myOption = selected ?? (myAnswer && typeof myAnswer.answer === 'object' && myAnswer.answer !== null && !Array.isArray(myAnswer.answer)
    ? String((myAnswer.answer as { option?: unknown }).option ?? '')
    : null);
  const canManage = round !== null && (isAdmin || round.created_by === myId);

  // Nueva ronda: se olvida la elección anterior.
  const roundId = round?.id ?? null;
  useEffect(() => setSelected(null), [roundId]);

  // Revelar cuando se acaba el tiempo o han respondido todos. Varios móviles pueden pedirlo: no pasa nada.
  const everyone = members.length > 0 && answeredBy.size >= members.length;
  useEffect(() => {
    if (!active || roundId === null || revealedRef.current === roundId) return;
    if ((endsAt !== null && now >= endsAt) || everyone) {
      revealedRef.current = roundId;
      void revealRound(roundId).catch(() => {
        revealedRef.current = null;
      });
    }
  }, [active, roundId, endsAt, now, everyone]);

  const startProbable = async () => {
    const question = pickQuestion(usedQuestionIds);
    if (question === null) {
      setActionError('Ya habéis jugado todas las preguntas de este viaje.');
      return;
    }
    const roundOptions: GameOption[] = members.map((member) => ({
      id: member.user_id,
      label: member.display_name,
      avatarKind: member.avatar_kind,
      avatarValue: member.avatar_value,
    }));
    await createRound(sessionId, 'probable', { questionId: question.id, question: question.text, options: roundOptions }, null, PROBABLE_SECONDS);
  };

  const start = async (game: GameInfo) => {
    setStarting(game.id);
    setActionError(null);
    try {
      if (game.id === 'probable') await startProbable();
    } catch (err) {
      setActionError(errorMessage(err));
    } finally {
      setStarting(null);
    }
  };

  const vote = async (option: string) => {
    if (round === null || myId === null) return;
    vibrate();
    setSelected(option);
    setActionError(null);
    try {
      await submitAnswer(round.id, { option });
      setMyAnswerLocal({ round_id: round.id, user_id: myId, answer: { option }, points: 0, created_at: new Date().toISOString() });
      markAnswered(myId);
      send('ronda', { roundId: round.id, userId: myId });
    } catch (err) {
      setActionError(errorMessage(err));
    }
  };

  const next = async () => {
    if (round === null) return;
    setStarting('probable');
    setActionError(null);
    try {
      await closeRound(round.id);
      await startProbable();
    } catch (err) {
      setActionError(errorMessage(err));
    } finally {
      setStarting(null);
    }
  };

  const finish = async () => {
    if (round === null) return;
    try {
      await closeRound(round.id);
    } catch (err) {
      setActionError(errorMessage(err));
    }
  };

  const result = useMemo(() => {
    const votes = answers
      .map((row) => {
        const answer = row.answer as { option?: unknown } | null;
        return { userId: row.user_id, option: typeof answer?.option === 'string' ? answer.option : '' };
      })
      .filter((row) => row.option !== '');
    return tally(votes, options);
  }, [answers, options]);
  const myPoints = answers.find((row) => row.user_id === myId)?.points ?? 0;
  const info = round ? gameInfo(round.game) : undefined;

  return (
    <Screen>
      <ScreenHeader eyebrow="Para todo el coche" title="Juegos" />
      {error ? <Notice message={error} /> : null}
      {actionError ? <Notice message={actionError} /> : null}

      {loading && round === null ? (
        <ActivityIndicator color={colors.primary} />
      ) : round === null ? (
        <GameLobby players={members.length} starting={starting} onStart={(game) => void start(game)} />
      ) : active ? (
        <View style={styles.block}>
          <View style={styles.question}>
            <Glow cy={0.1} />
            <View style={styles.questionTop}>
              <Badge label={info?.name ?? 'Juego'} tone="primary" />
              {endsAt ? <Countdown secondsLeft={secondsLeft} totalSeconds={PROBABLE_SECONDS} /> : null}
            </View>
            <AppText variant="display" accessibilityRole="header">
              {payload.question ?? '¿…?'}
            </AppText>
            <View style={styles.progress}>
              <Ionicons name="people" size={18} color={colors.textSecondary} />
              <AppText variant="label" color={colors.textSecondary}>
                {answeredBy.size} de {members.length} han votado
              </AppText>
            </View>
          </View>
          <OptionList options={options} selected={myOption} disabled={secondsLeft <= 0} onSelect={(id) => void vote(id)} />
          <AppText variant="caption" color={colors.textTertiary} style={styles.center}>
            {myOption ? 'Puedes cambiar tu voto mientras quede tiempo.' : 'Toca a quien creas. Nadie verá los votos hasta el final.'}
          </AppText>
        </View>
      ) : (
        <View style={styles.block}>
          <View style={styles.question}>
            <Glow cy={0.1} />
            <Badge label="Resultado" tone="primary" />
            <AppText variant="title">{payload.question ?? ''}</AppText>
            {result.winners.length > 0 ? (
              <AppText variant="display" color={colors.primaryText}>
                {result.winners.map((id) => options.find((option) => option.id === id)?.label ?? '').join(' y ')}
              </AppText>
            ) : (
              <AppText color={colors.textSecondary}>Nadie ha votado esta vez.</AppText>
            )}
            <AppText variant="label" color={myPoints > 0 ? colors.success : colors.textSecondary}>
              {myPoints > 0 ? `¡Has acertado! +${myPoints} puntos` : myOption ? 'Esta vez no has acertado.' : 'No has votado.'}
            </AppText>
          </View>
          <ResultsBars result={result} options={options} />
          {canManage ? (
            <View style={styles.actions}>
              <Button label="Otra pregunta" icon="refresh" size="lg" loading={starting !== null} onPress={() => void next()} />
              <Button label="Terminar" variant="secondary" onPress={() => void finish()} />
            </View>
          ) : (
            <AppText color={colors.textSecondary} style={styles.center}>
              Quien lanzó el juego decide si seguís.
            </AppText>
          )}
        </View>
      )}
      <View style={styles.bottomSpace} />
    </Screen>
  );
}

const makeStyles = (c: Palette) =>
  StyleSheet.create({
    block: { gap: spacing.md },
    question: {
      gap: spacing.sm + 2,
      padding: spacing.md + 4,
      borderRadius: radius.lg,
      backgroundColor: c.surfaceRaised,
      borderWidth: 1,
      borderColor: c.border,
      overflow: 'hidden',
    },
    questionTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    progress: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    center: { textAlign: 'center' },
    actions: { gap: spacing.sm },
    bottomSpace: { height: 72 },
  });
