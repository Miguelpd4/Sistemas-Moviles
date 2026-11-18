import Ionicons from '@expo/vector-icons/Ionicons';
import { memo, useEffect, useMemo, useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { OptionList, type GameOption } from '@/components/juegos/OptionList';
import { ResultsBars } from '@/components/juegos/ResultsBars';
import { AppText, Avatar, Badge, Button, Glow, Notice } from '@/components/ui';
import type { DjRound } from '@/hooks/useDjRound';
import { useSession } from '@/hooks/useSession';
import { turnStatus, voteOptions, type TurnStatus } from '@/lib/games/dj';
import { errorMessage } from '@/lib/errors';
import { tally } from '@/lib/games/tally';
import { vibrate } from '@/services/device/feedback';
import { closeRound, revealRound, skipDjTurn, startDjRound, submitAnswer } from '@/services/supabase/games';
import { radius, spacing, useStyles, useTheme, type Palette } from '@/theme';

/** Puntos para el DJ de la canción más votada (los da `reveal_round`). */
const DJ_POINTS = 50;

const TURN_TEXT: Record<TurnStatus, string> = {
  eligio: 'Ya ha elegido',
  le_toca: 'Le toca',
  saltado: 'Turno saltado',
  fuera: 'Ya no está',
  espera: 'Espera',
};

/**
 * Turnos de DJ (#20) en la pestaña Música: por orden de asiento, cada pasajero elige una canción;
 * cuando han sonado todas, se vota la mejor (sin saber quién puso cada una) y su DJ gana puntos.
 */
function DjRoundPanelBase({ dj }: { dj: DjRound }) {
  const { colors } = useTheme();
  const styles = useStyles(makeStyles);
  const { sessionId, members, myId, isAdmin, send } = useSession();
  const { round, state, payload, songs, insideIds, answers, myAnswer, answeredBy, markAnswered, setMyAnswerLocal } = dj;
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const revealedRef = useRef<string | null>(null);

  const passengers = members.filter((member) => member.role !== 'conductor');
  const canManage = round !== null && (isAdmin || round.created_by === myId);
  const roundId = round?.id ?? null;
  const voting = round?.status === 'activa' && state?.phase === 'votando';

  // Revelar en cuanto han votado todos los pasajeros. Varios móviles pueden pedirlo: no pasa nada.
  const everyone = passengers.length > 0 && answeredBy.size >= passengers.length;
  useEffect(() => {
    if (!voting || roundId === null || !everyone || revealedRef.current === roundId) return;
    revealedRef.current = roundId;
    void revealRound(roundId).catch(() => {
      revealedRef.current = null;
    });
  }, [voting, roundId, everyone]);

  const run = async (action: () => Promise<unknown>) => {
    setBusy(true);
    setError(null);
    try {
      await action();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  const vote = async (option: string) => {
    if (round === null || myId === null) return;
    vibrate();
    setError(null);
    try {
      await submitAnswer(round.id, { option });
      setMyAnswerLocal({ round_id: round.id, user_id: myId, answer: { option }, points: 0, created_at: new Date().toISOString() });
      markAnswered(myId);
      send('ronda', { roundId: round.id, userId: myId });
    } catch (err) {
      setError(errorMessage(err));
    }
  };

  const myOption =
    myAnswer && typeof myAnswer.answer === 'object' && myAnswer.answer !== null && !Array.isArray(myAnswer.answer)
      ? String((myAnswer.answer as { option?: unknown }).option ?? '')
      : null;

  // Resultado: cada canción con el avatar de su DJ (ya no es secreto).
  const resultOptions = useMemo<GameOption[]>(
    () =>
      songs.map((song) => {
        const who = payload.turns.find((turn) => turn.id === song.added_by);
        return { id: song.id, label: song.title, detail: song.artist, avatarKind: who?.avatarKind, avatarValue: who?.avatarValue };
      }),
    [songs, payload.turns],
  );
  const result = useMemo(() => {
    const votes = answers
      .map((row) => {
        const answer = row.answer as { option?: unknown } | null;
        return { userId: row.user_id, option: typeof answer?.option === 'string' ? answer.option : '' };
      })
      .filter((row) => row.option !== '');
    return tally(votes, resultOptions);
  }, [answers, resultOptions]);

  if (round === null || state === null) {
    const enough = passengers.length >= 2;
    return (
      <View style={styles.card}>
        <View style={styles.head}>
          <Ionicons name="headset" size={24} color={colors.primary} />
          <AppText variant="title" accessibilityRole="header" style={styles.flex}>
            Turnos de DJ
          </AppText>
        </View>
        <AppText color={colors.textSecondary}>
          Por orden de asiento, cada uno elige una canción. Cuando hayan sonado todas, votáis la mejor sin saber de quién es.
        </AppText>
        {error ? <Notice message={error} /> : null}
        <Button
          label={enough ? 'Empezar ronda de DJ' : 'Hacen falta 2 pasajeros'}
          icon="play"
          variant="secondary"
          disabled={!enough}
          loading={busy}
          onPress={() => void run(() => startDjRound(sessionId))}
        />
      </View>
    );
  }

  if (round.status === 'revelada') {
    const winners = result.winners.map((id) => resultOptions.find((option) => option.id === id)).filter((option) => option !== undefined);
    const myPoints = answers.find((row) => row.user_id === myId)?.points ?? 0;
    return (
      <View style={styles.card}>
        <Glow cy={0.1} />
        <Badge label="Ronda de DJ · resultado" tone="primary" />
        {winners.length > 0 ? (
          winners.map((option) => {
            const who = payload.turns.find((turn) => songs.find((song) => song.id === option.id)?.added_by === turn.id);
            return (
              <View key={option.id} style={styles.winner}>
                {who ? <Avatar kind={who.avatarKind ?? 'preset'} value={who.avatarValue ?? ''} size={48} /> : null}
                <View style={styles.flex}>
                  <AppText variant="title" color={colors.primaryText} numberOfLines={2}>
                    {option.label}
                  </AppText>
                  <AppText color={colors.textSecondary} numberOfLines={1}>
                    DJ: {who?.label ?? '—'}
                  </AppText>
                </View>
              </View>
            );
          })
        ) : (
          <AppText color={colors.textSecondary}>Nadie ha votado esta vez.</AppText>
        )}
        <AppText variant="label" color={myPoints > 0 ? colors.success : colors.textSecondary}>
          {myPoints > 0 ? `¡Tu canción ha ganado! +${DJ_POINTS} puntos` : 'La mejor canción da puntos a su DJ.'}
        </AppText>
        <ResultsBars result={result} options={resultOptions} />
        {error ? <Notice message={error} /> : null}
        {canManage ? (
          <View style={styles.actions}>
            <Button
              label="Otra ronda"
              icon="refresh"
              loading={busy}
              onPress={() =>
                void run(async () => {
                  await closeRound(round.id);
                  await startDjRound(sessionId);
                })
              }
            />
            <Button label="Terminar" variant="secondary" disabled={busy} onPress={() => void run(() => closeRound(round.id))} />
          </View>
        ) : null}
      </View>
    );
  }

  const mine = songs.some((song) => song.added_by === myId);
  return (
    <View style={styles.card}>
      <Glow cy={0.1} />
      <View style={styles.head}>
        <Ionicons name="headset" size={24} color={colors.primary} />
        <AppText variant="title" accessibilityRole="header" style={styles.flex}>
          Ronda de DJ
        </AppText>
        <Badge label={state.phase === 'votando' ? 'A votar' : state.phase === 'escuchando' ? 'Sonando' : 'Eligiendo'} tone="primary" />
      </View>

      {state.phase === 'eligiendo' ? (
        <>
          <AppText variant="heading" color={state.currentTurn?.id === myId ? colors.primaryText : colors.text}>
            {state.currentTurn?.id === myId ? '¡Te toca! Busca tu canción aquí debajo.' : `Le toca a ${state.currentTurn?.label ?? '…'}`}
          </AppText>
          <View style={styles.turns}>
            {payload.turns.map((turn) => {
              const status = turnStatus(turn, state, payload, insideIds, songs);
              return (
                <View key={turn.id} style={styles.turn} accessible accessibilityLabel={`${turn.label}: ${TURN_TEXT[status]}`}>
                  <Avatar kind={turn.avatarKind ?? 'preset'} value={turn.avatarValue ?? ''} size={32} />
                  <AppText style={styles.flex} numberOfLines={1} color={status === 'fuera' || status === 'saltado' ? colors.textTertiary : colors.text}>
                    {turn.label}
                  </AppText>
                  {status === 'eligio' ? <Ionicons name="checkmark-circle" size={22} color={colors.success} /> : null}
                  {status === 'le_toca' ? <Ionicons name="musical-note" size={22} color={colors.primary} /> : null}
                  {status === 'saltado' || status === 'fuera' ? (
                    <AppText variant="caption" color={colors.textTertiary}>
                      {TURN_TEXT[status]}
                    </AppText>
                  ) : null}
                </View>
              );
            })}
          </View>
          {canManage && state.currentTurn !== null && state.currentTurn.id !== myId ? (
            <Button
              label={`Saltar el turno de ${state.currentTurn.label}`}
              variant="ghost"
              loading={busy}
              onPress={() => void run(() => skipDjTurn(round.id))}
            />
          ) : null}
        </>
      ) : null}

      {state.phase === 'escuchando' ? (
        <AppText color={colors.textSecondary}>
          Suenan las canciones de la ronda: van {state.played} de {state.total}. Cuando acaben, votaréis la mejor.
        </AppText>
      ) : null}

      {state.phase === 'votando' ? (
        <>
          <AppText variant="heading">¿Cuál ha sido la mejor canción?</AppText>
          <AppText variant="label" color={colors.textSecondary}>
            {answeredBy.size} de {passengers.length} han votado{mine ? ' · la tuya no sale' : ''}
          </AppText>
          <OptionList options={voteOptions(songs, myId)} selected={myOption} disabled={false} onSelect={(id) => void vote(id)} />
          {canManage ? (
            <Button label="Ver resultado" variant="secondary" loading={busy} onPress={() => void run(() => revealRound(round.id))} />
          ) : null}
        </>
      ) : null}

      {state.phase === 'vacia' ? (
        <AppText color={colors.textSecondary}>Nadie ha elegido canción en esta ronda.</AppText>
      ) : null}

      {error ? <Notice message={error} /> : null}
      {canManage && state.phase !== 'votando' ? (
        <Button label="Terminar la ronda" variant="ghost" disabled={busy} onPress={() => void run(() => closeRound(round.id))} />
      ) : null}
    </View>
  );
}

export const DjRoundPanel = memo(DjRoundPanelBase);

const makeStyles = (c: Palette) =>
  StyleSheet.create({
    card: {
      gap: spacing.sm + 2,
      padding: spacing.md + 2,
      marginTop: spacing.sm,
      borderRadius: radius.lg,
      backgroundColor: c.surfaceRaised,
      borderWidth: 1,
      borderColor: c.border,
      overflow: 'hidden',
    },
    head: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
    flex: { flex: 1 },
    turns: { gap: spacing.xs + 2 },
    turn: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, minHeight: 40 },
    winner: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm + 2 },
    actions: { gap: spacing.sm },
  });
