import Ionicons from '@expo/vector-icons/Ionicons';
import { useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { Countdown } from '@/components/juegos/Countdown';
import { GameLobby } from '@/components/juegos/GameLobby';
import { GuessWhoSong } from '@/components/juegos/GuessWhoSong';
import { PlateEntry, PlateFinders, PlateRanking, type PlateRow } from '@/components/juegos/PlateHunt';
import { OptionList, type GameOption } from '@/components/juegos/OptionList';
import { ResultsBars } from '@/components/juegos/ResultsBars';
import { AppText, Avatar, Badge, Button, Glow, Notice, Screen, ScreenHeader } from '@/components/ui';
import { gameInfo } from '@/games/registry';
import { useActiveRound } from '@/hooks/useActiveRound';
import { useNow } from '@/hooks/useNow';
import { useQueue } from '@/hooks/useQueue';
import { useSession } from '@/hooks/useSession';
import { useTripMetrics } from '@/hooks/useTripMetrics';
import { AppError, errorMessage } from '@/lib/errors';
import { SONG_QUIZ_SECONDS, readSongQuizPayload } from '@/lib/games/adivinaCancion';
import {
  PLATE_SECONDS,
  challengeExample,
  describeChallenge,
  formatPlate,
  normalizePlate,
  pickChallenge,
  plateMatches,
  readPlateAnswer,
  readPlateChallenge,
} from '@/lib/games/matriculas';
import { PROBABLE_SECONDS, pickQuestion } from '@/lib/games/probable';
import {
  GUESS_WHO_BLOCKER_MESSAGES,
  GUESS_WHO_SECONDS,
  expectedAnswers,
  guessWhoBlocker,
  readGuessWhoPayload,
  readSolutionOption,
} from '@/lib/games/quienLaPuso';
import { tally } from '@/lib/games/tally';
import { TRIVIAL_SECONDS, buildTrivia, readTrivialPayload, readTrivialSolution } from '@/lib/games/trivial';
import { formatKm } from '@/lib/format';
import { fetchNearbyPlaces } from '@/services/games/wikipedia';
import { getMyPosition } from '@/services/location/watch';
import { vibrate } from '@/services/device/feedback';
import { closeRound, createRound, revealRound, startGuessWho, startSongQuiz, submitAnswer, submitPlate, type GameId } from '@/services/supabase/games';
import { radius, spacing, useStyles, useTheme, type Palette } from '@/theme';
import type { Json } from '@/types/database';

type ProbablePayload = { questionId?: string; question?: string; options?: GameOption[] };

function readPayload(payload: Json | undefined): ProbablePayload {
  return typeof payload === 'object' && payload !== null && !Array.isArray(payload) ? (payload as ProbablePayload) : {};
}

/**
 * Pestaña Juegos: el motor de rondas con «¿Quién es más probable que…?» (S2-09), «Adivina la
 * canción» (#21), «¿Quién la ha puesto?» (#22), «Trivial del camino» y «Cazamatrículas» (#48).
 * Todos responden a la vez, nadie ve las respuestas hasta el final y el resultado aparece en todas
 * las pantallas. El conductor no juega.
 */
export default function JuegosScreen() {
  const { colors } = useTheme();
  const styles = useStyles(makeStyles);
  const { sessionId, members, myId, isAdmin, isHost, send } = useSession();
  const {
    round,
    answers,
    myAnswer,
    answeredBy,
    solution,
    usedQuestionIds,
    usedQueueIds,
    usedTrivialIds,
    usedPlateChallenges,
    loading,
    error,
    markAnswered,
    setMyAnswerLocal,
  } = useActiveRound();
  const metrics = useTripMetrics();
  const queue = useQueue();
  const [starting, setStarting] = useState<string | null>(null);
  // Lo que he elegido va con su ronda: en una ronda nueva se olvida solo.
  const [picked, setPicked] = useState<{ roundId: string; option: string } | null>(null);
  const selected = picked !== null && picked.roundId === round?.id ? picked.option : null;
  const [actionError, setActionError] = useState<string | null>(null);
  const now = useNow(500);
  const revealedRef = useRef<string | null>(null);

  const isGuessWho = round?.game === 'quien_la_puso';
  const isSongQuiz = round?.game === 'adivina_cancion';
  const isTrivial = round?.game === 'trivial';
  const isPlates = round?.game === 'matriculas';
  const probable = readPayload(round?.payload);
  const guess = useMemo(() => (isGuessWho ? readGuessWhoPayload(round?.payload) : null), [isGuessWho, round?.payload]);
  const quiz = useMemo(() => (isSongQuiz ? readSongQuizPayload(round?.payload) : null), [isSongQuiz, round?.payload]);
  const trivia = useMemo(() => (isTrivial ? readTrivialPayload(round?.payload) : null), [isTrivial, round?.payload]);
  const challenge = useMemo(() => (isPlates ? readPlateChallenge(round?.payload) : null), [isPlates, round?.payload]);
  const probableOptions = probable.options;
  const options = useMemo<readonly GameOption[]>(
    () => (guess ? guess.options : quiz ? quiz.options : trivia ? trivia.options : (probableOptions ?? [])),
    [guess, quiz, trivia, probableOptions],
  );
  const totalSeconds = isGuessWho
    ? GUESS_WHO_SECONDS
    : isSongQuiz
      ? SONG_QUIZ_SECONDS
      : isTrivial
        ? TRIVIAL_SECONDS
        : isPlates
          ? PLATE_SECONDS
          : PROBABLE_SECONDS;
  const endsAt = round?.ends_at ? new Date(round.ends_at).getTime() : null;
  const secondsLeft = endsAt ? Math.max(0, Math.ceil((endsAt - now) / 1000)) : 0;
  const active = round?.status === 'activa';
  const myOption = selected ?? (myAnswer && typeof myAnswer.answer === 'object' && myAnswer.answer !== null && !Array.isArray(myAnswer.answer)
    ? String((myAnswer.answer as { option?: unknown }).option ?? '')
    : null);
  const canManage = round !== null && (isAdmin || round.created_by === myId);

  // Quien puso la canción no responde. Se sabe por la cola mientras la canción sigue en ella.
  const adderId = guess?.queueId ? (queue.items.find((item) => item.id === guess.queueId)?.added_by ?? null) : null;
  const iPutIt = isGuessWho && adderId !== null && adderId === myId;

  const roundId = round?.id ?? null;

  // Revelar cuando se acaba el tiempo o han respondido todos. Varios móviles pueden pedirlo: no pasa nada.
  // El conductor conduce: no se espera su respuesta.
  const playerIds = members.filter((member) => member.role !== 'conductor').map((member) => member.user_id);
  const needed = isGuessWho ? expectedAnswers(playerIds, adderId) : playerIds.length;
  const everyone = needed > 0 && answeredBy.size >= needed;
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
    if (question === null) throw new AppError('Ya habéis jugado todas las preguntas de este viaje.');
    const roundOptions: GameOption[] = members.map((member) => ({
      id: member.user_id,
      label: member.display_name,
      avatarKind: member.avatar_kind,
      avatarValue: member.avatar_value,
    }));
    await createRound(sessionId, 'probable', { questionId: question.id, question: question.text, options: roundOptions }, null, PROBABLE_SECONDS);
  };

  const startGuess = async () => {
    const blocker = guessWhoBlocker({ nowPlayingId: queue.nowPlaying?.id ?? null, players: members.length, usedQueueIds });
    if (blocker !== null) throw new AppError(GUESS_WHO_BLOCKER_MESSAGES[blocker]);
    await startGuessWho(sessionId, GUESS_WHO_SECONDS);
  };

  /** Trivial: la pregunta sale de los sitios de Wikipedia cerca de este móvil (o del coche). */
  const startTrivial = async () => {
    let here: { lat: number; lon: number } | null = null;
    try {
      here = await getMyPosition();
    } catch (err) {
      if (metrics?.last_lat == null || metrics.last_lon == null) throw err;
      here = { lat: metrics.last_lat, lon: metrics.last_lon };
    }
    const places = await fetchNearbyPlaces(here);
    const question = buildTrivia(places, Math.random, usedTrivialIds);
    if (question === null) {
      throw new AppError('No hay bastantes sitios de Wikipedia a menos de 10 km. Probad al pasar por un pueblo o una ciudad.');
    }
    await createRound(sessionId, 'trivial', question.payload, question.solution, TRIVIAL_SECONDS);
  };

  const startPlates = async () => {
    await createRound(sessionId, 'matriculas', { challenge: pickChallenge(Math.random, usedPlateChallenges) }, null, PLATE_SECONDS);
  };

  const startGame = async (game: GameId) => {
    if (game === 'probable') await startProbable();
    else if (game === 'trivial') await startTrivial();
    else if (game === 'matriculas') await startPlates();
    else if (game === 'quien_la_puso') await startGuess();
    else if (game === 'adivina_cancion') await startSongQuiz(sessionId, SONG_QUIZ_SECONDS);
  };

  const start = async (game: GameId) => {
    setStarting(game);
    setActionError(null);
    try {
      await startGame(game);
    } catch (err) {
      setActionError(errorMessage(err));
    } finally {
      setStarting(null);
    }
  };

  const vote = async (option: string) => {
    if (round === null || myId === null) return;
    vibrate();
    setPicked({ roundId: round.id, option });
    setActionError(null);
    try {
      await submitAnswer(round.id, { option });
      setMyAnswerLocal({ round_id: round.id, user_id: myId, answer: { option }, points: 0, created_at: new Date().toISOString() });
      markAnswered(myId);
      send('ronda', { roundId: round.id, userId: myId });
    } catch (err) {
      setPicked(null);
      setActionError(errorMessage(err));
    }
  };

  /** Cazamatrículas: se comprueba aquí para avisar al momento, y el servidor lo vuelve a comprobar. */
  const sendPlate = async (text: string): Promise<boolean> => {
    if (round === null || myId === null || challenge === null) return false;
    setActionError(null);
    const plate = normalizePlate(text);
    if (plate === null) {
      setActionError('Escribe la matrícula como 1234 BCD (cuatro números y tres consonantes).');
      return false;
    }
    if (!plateMatches(challenge, plate)) {
      setActionError(`${formatPlate(plate)} no cumple el reto. ¡Sigue buscando!`);
      return false;
    }
    try {
      const points = await submitPlate(round.id, plate);
      vibrate();
      const position = points === 10 ? answeredBy.size + 1 : [100, 75, 50, 25].indexOf(points) + 1;
      setMyAnswerLocal({ round_id: round.id, user_id: myId, answer: { plate, position }, points, created_at: new Date().toISOString() });
      markAnswered(myId);
      send('ronda', { roundId: round.id, userId: myId });
      return true;
    } catch (err) {
      setActionError(errorMessage(err));
      return false;
    }
  };

  const next = async () => {
    if (round === null) return;
    const game = round.game as GameId;
    setStarting(game);
    setActionError(null);
    try {
      await closeRound(round.id);
      await startGame(game);
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
  const trivialSolution = isTrivial ? readTrivialSolution(solution) : null;
  const memberById = useMemo(() => new Map(members.map((member) => [member.user_id, member])), [members]);
  const finders = useMemo(
    () =>
      [...answeredBy].flatMap((id) => {
        const member = memberById.get(id);
        return member ? [{ id, name: member.display_name, avatarKind: member.avatar_kind, avatarValue: member.avatar_value }] : [];
      }),
    [answeredBy, memberById],
  );
  const plateRows = useMemo<PlateRow[]>(
    () =>
      answers
        .flatMap((row): PlateRow[] => {
          const found = readPlateAnswer(row.answer);
          const member = memberById.get(row.user_id);
          if (!found || !member) return [];
          return [
            {
              id: row.user_id,
              name: member.display_name,
              avatarKind: member.avatar_kind,
              avatarValue: member.avatar_value,
              plate: found.plate,
              position: found.position,
              points: row.points,
            },
          ];
        })
        .sort((a, b) => a.position - b.position),
    [answers, memberById],
  );
  const myPlate = isPlates && myAnswer ? readPlateAnswer(myAnswer.answer) : null;
  const solutionId = readSolutionOption(solution);
  const solutionOption = solutionId ? (options.find((option) => option.id === solutionId) ?? null) : null;

  const myResult = (() => {
    if (isPlates) {
      if (myPoints > 0) return `¡Has cazado la tuya! +${myPoints} puntos`;
      return isHost ? 'Tú conducías: este reto era para los pasajeros.' : 'Esta vez no la has encontrado.';
    }
    if (myPoints > 0) return `¡Has acertado! +${myPoints} puntos`;
    if (isGuessWho && solutionId !== null && solutionId === myId) return '¡Era tuya! A ver si alguien te ha pillado.';
    return myOption ? 'Esta vez no has acertado.' : 'No has votado.';
  })();

  return (
    <Screen>
      <ScreenHeader eyebrow="Para todo el coche" title="Juegos" />
      {error ? <Notice message={error} /> : null}
      {actionError ? <Notice message={actionError} /> : null}

      {loading && round === null ? (
        <ActivityIndicator color={colors.primary} />
      ) : round === null ? (
        <GameLobby players={members.length} starting={starting} onStart={(game) => void start(game.id)} />
      ) : active ? (
        <View style={styles.block}>
          <View style={styles.question}>
            <Glow cy={0.1} />
            <View style={styles.questionTop}>
              <Badge label={info?.name ?? 'Juego'} tone="primary" />
              {endsAt ? <Countdown secondsLeft={secondsLeft} totalSeconds={totalSeconds} /> : null}
            </View>
            {guess ? <GuessWhoSong title={guess.title} artist={guess.artist} albumArtUrl={guess.albumArtUrl} /> : null}
            <AppText variant="display" accessibilityRole="header">
              {guess
                ? '¿Quién ha puesto esta canción?'
                : quiz
                  ? '¿Qué canción suena?'
                  : trivia
                    ? trivia.question
                    : challenge
                      ? describeChallenge(challenge)
                      : (probable.question ?? '¿…?')}
            </AppText>
            {trivia?.clue ? (
              <View style={styles.clue}>
                <Ionicons name="book-outline" size={18} color={colors.primary} />
                <AppText style={styles.flex} color={colors.textSecondary}>
                  «{trivia.clue}»
                </AppText>
              </View>
            ) : null}
            {challenge ? (
              <AppText variant="label" color={colors.textSecondary}>
                Por ejemplo: {challengeExample(challenge)}. Solo valen las matrículas nuevas (4 números y 3 letras).
              </AppText>
            ) : null}
            {quiz ? (
              <View style={styles.progress}>
                <Ionicons name="volume-high" size={18} color={colors.primary} />
                <AppText variant="label" color={colors.textSecondary}>
                  Escucha: suenan {quiz.clipSeconds} segundos en el coche
                </AppText>
              </View>
            ) : null}
            <View style={styles.progress}>
              <Ionicons name="people" size={18} color={colors.textSecondary} />
              <AppText variant="label" color={colors.textSecondary}>
                {answeredBy.size} de {needed} {isPlates ? 'la han encontrado' : 'han votado'}
              </AppText>
            </View>
          </View>
          {isPlates ? (
            <>
              {isHost ? (
                <Notice tone="info" message="Tú conduces: que busquen los pasajeros. Al final verás quién ha ganado." />
              ) : (
                <PlateEntry
                  disabled={secondsLeft <= 0}
                  found={myPlate ? { plate: myPlate.plate, points: myPoints } : null}
                  onSubmit={sendPlate}
                />
              )}
              <PlateFinders people={finders} />
            </>
          ) : iPutIt ? (
            <View style={styles.secret}>
              <Ionicons name="eye-off" size={28} color={colors.primary} />
              <AppText variant="heading">La has puesto tú</AppText>
              <AppText color={colors.textSecondary} style={styles.center}>
                Esta vez no respondes. ¡Disimula y no te delates!
              </AppText>
            </View>
          ) : (
            <>
              <OptionList options={options} selected={myOption} disabled={secondsLeft <= 0} onSelect={(id) => void vote(id)} />
              <AppText variant="caption" color={colors.textTertiary} style={styles.center}>
                {myOption
                  ? 'Puedes cambiar tu voto mientras quede tiempo.'
                  : quiz
                    ? 'Toca la canción que creas. Nadie verá las respuestas hasta el final.'
                    : trivia
                      ? 'Toca el sitio que creas. Nadie verá las respuestas hasta el final.'
                      : 'Toca a quien creas. Nadie verá los votos hasta el final.'}
              </AppText>
            </>
          )}
        </View>
      ) : (
        <View style={styles.block}>
          <View style={styles.question}>
            <Glow cy={0.1} />
            <Badge label="Resultado" tone="primary" />
            {challenge ? (
              <AppText variant="title">{describeChallenge(challenge)}</AppText>
            ) : trivia ? (
              trivialSolution && solutionOption ? (
                <View style={styles.winnerText}>
                  <AppText variant="caption" color={colors.textSecondary}>
                    {trivia.kind === 'mas_cerca' ? 'El más cercano era…' : 'Era…'}
                  </AppText>
                  <AppText variant="display" color={colors.primaryText}>
                    {solutionOption.label}
                  </AppText>
                  <AppText variant="label" color={colors.textSecondary}>
                    A {formatKm(trivialSolution.distanceM)} de donde se hizo la pregunta
                  </AppText>
                  {trivialSolution.extract ? (
                    <AppText color={colors.textSecondary} numberOfLines={5}>
                      {trivialSolution.extract}
                    </AppText>
                  ) : null}
                </View>
              ) : (
                <ActivityIndicator color={colors.primary} />
              )
            ) : quiz ? (
              solutionOption ? (
                <View style={styles.winnerText}>
                  <AppText variant="caption" color={colors.textSecondary}>
                    Era…
                  </AppText>
                  <AppText variant="display" color={colors.primaryText}>
                    {solutionOption.label}
                  </AppText>
                  {solutionOption.detail ? <AppText color={colors.textSecondary}>{solutionOption.detail}</AppText> : null}
                </View>
              ) : (
                <ActivityIndicator color={colors.primary} />
              )
            ) : guess ? (
              <>
                <GuessWhoSong title={guess.title} artist={guess.artist} albumArtUrl={guess.albumArtUrl} />
                {solutionOption ? (
                  <View style={styles.winner}>
                    <Avatar kind={solutionOption.avatarKind ?? 'preset'} value={solutionOption.avatarValue ?? ''} size={48} />
                    <AppText variant="display" color={colors.primaryText} style={styles.flex}>
                      La puso {solutionOption.label}
                    </AppText>
                  </View>
                ) : (
                  <ActivityIndicator color={colors.primary} />
                )}
              </>
            ) : (
              <>
                <AppText variant="title">{probable.question ?? ''}</AppText>
                {result.winners.length > 0 ? (
                  <AppText variant="display" color={colors.primaryText}>
                    {result.winners.map((id) => options.find((option) => option.id === id)?.label ?? '').join(' y ')}
                  </AppText>
                ) : (
                  <AppText color={colors.textSecondary}>Nadie ha votado esta vez.</AppText>
                )}
              </>
            )}
            <AppText variant="label" color={myPoints > 0 ? colors.success : colors.textSecondary}>
              {myResult}
            </AppText>
          </View>
          {isPlates ? <PlateRanking rows={plateRows} /> : <ResultsBars result={result} options={options} icon={isTrivial ? 'location' : 'musical-notes'} />}
          {canManage ? (
            <View style={styles.actions}>
              <Button
                label={isGuessWho || isSongQuiz ? 'Otra canción' : isPlates ? 'Otro reto' : 'Otra pregunta'}
                icon="refresh"
                size="lg"
                loading={starting !== null}
                onPress={() => void next()}
              />
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
    secret: {
      alignItems: 'center',
      gap: spacing.xs,
      padding: spacing.lg,
      borderRadius: radius.lg,
      backgroundColor: c.primarySoft,
    },
    winner: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm + 2 },
    winnerText: { gap: 2 },
    clue: {
      flexDirection: 'row',
      gap: spacing.sm,
      padding: spacing.sm + 4,
      borderRadius: radius.md,
      backgroundColor: c.surface,
    },
    flex: { flex: 1 },
    center: { textAlign: 'center' },
    actions: { gap: spacing.sm },
    bottomSpace: { height: 72 },
  });
