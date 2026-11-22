import { AppError, toAppError } from '@/lib/errors';
import type { GameAnswerRow, GameRoundRow, Json } from '@/types/database';

import { supabase } from './client';

/** Motor de juegos (S2-09): crear rondas, responder, revelar y cerrar. */

export type GameId = 'probable' | 'trivial' | 'bingo' | 'adivina_cancion' | 'quien_la_puso' | 'dj' | 'matriculas';
export type RoundRow = GameRoundRow;
export type AnswerRow = GameAnswerRow;

export async function createRound(
  sessionId: string,
  game: GameId,
  payload: Json,
  solution: Json | null = null,
  seconds: number | null = null,
): Promise<string> {
  const { data, error } = await supabase.rpc('create_round', {
    p_session_id: sessionId,
    p_game: game,
    p_payload: payload,
    p_solution: solution,
    p_seconds: seconds,
  });
  if (error) throw toAppError(error, 'No se ha podido empezar el juego.');
  return data;
}

/** «¿Quién la ha puesto?» (#22): el servidor crea la ronda con la canción que suena y guarda quién la puso. */
export async function startGuessWho(sessionId: string, seconds: number): Promise<string> {
  const { data, error } = await supabase.rpc('start_guess_who', { p_session_id: sessionId, p_seconds: seconds });
  if (error) throw toAppError(error, 'No se ha podido empezar el juego.');
  return data;
}

/** «Adivina la canción» (#21): el servidor elige la canción, el segundo y las opciones. */
export async function startSongQuiz(sessionId: string, seconds: number): Promise<string> {
  const { data, error } = await supabase.rpc('start_song_quiz', { p_session_id: sessionId, p_seconds: seconds });
  if (error) throw toAppError(error, 'No se ha podido empezar el juego.');
  return data;
}

/** Solo el conductor y con la ronda activa: qué canción poner y desde qué segundo. */
export async function getSongClip(roundId: string): Promise<Json> {
  const { data, error } = await supabase.rpc('get_song_clip', { p_round_id: roundId });
  if (error) throw toAppError(error, 'No se ha podido preparar el fragmento.');
  return data;
}

/** Turnos de DJ (#20): empieza una ronda con los pasajeros por orden de asiento. */
export async function startDjRound(sessionId: string): Promise<string> {
  const { data, error } = await supabase.rpc('start_dj_round', { p_session_id: sessionId });
  if (error) throw toAppError(error, 'No se ha podido empezar la ronda de DJ.');
  return data;
}

/** Salta el turno de quien no elige (conductor, copiloto o quien empezó la ronda). */
export async function skipDjTurn(roundId: string): Promise<void> {
  const { error } = await supabase.rpc('skip_dj_turn', { p_round_id: roundId });
  if (error) throw toAppError(error, 'No se ha podido saltar el turno.');
}

/** Cazamatrículas (#48): la matrícula vista; el servidor comprueba el reto y devuelve los puntos. */
export async function submitPlate(roundId: string, plate: string): Promise<number> {
  const { data, error } = await supabase.rpc('submit_plate', { p_round_id: roundId, p_plate: plate });
  if (error) throw toAppError(error, 'No se ha podido enviar la matrícula.');
  return data;
}

/** Bingo de carretera (#48): marca una casilla del propio cartón; devuelve línea, bingo y puntos. */
export async function bingoMark(roundId: string, item: string): Promise<Json> {
  const { data, error } = await supabase.rpc('bingo_mark', { p_round_id: roundId, p_item: item });
  if (error) throw toAppError(error, 'No se ha podido marcar la casilla.');
  return data;
}

export async function submitAnswer(roundId: string, answer: Json): Promise<void> {
  const { error } = await supabase.rpc('submit_answer', { p_round_id: roundId, p_answer: answer });
  if (error) throw toAppError(error, 'No se ha podido enviar tu respuesta.');
}

/** Revela la ronda. Si aún es pronto (otro cliente con el reloj adelantado), no pasa nada. */
export async function revealRound(roundId: string): Promise<void> {
  const { error } = await supabase.rpc('reveal_round', { p_round_id: roundId });
  if (error) {
    const appError = toAppError(error, 'No se ha podido mostrar el resultado.');
    if (appError.code === 'TOO_EARLY') return;
    throw appError;
  }
}

export async function closeRound(roundId: string): Promise<void> {
  const { error } = await supabase.rpc('close_round', { p_round_id: roundId });
  if (error) throw toAppError(error, 'No se ha podido terminar el juego.');
}

/** Rondas de la sesión, de la más reciente a la más antigua. */
export async function getRounds(sessionId: string): Promise<RoundRow[]> {
  const { data, error } = await supabase
    .from('game_rounds')
    .select('*')
    .eq('session_id', sessionId)
    .order('created_at', { ascending: false })
    .limit(80);
  if (error) throw toAppError(error, 'No se han podido cargar los juegos.');
  return data;
}

/** Con la ronda activa, solo la propia (RLS); revelada, todas. */
export async function getAnswers(roundId: string): Promise<AnswerRow[]> {
  const { data, error } = await supabase.from('game_answers').select('*').eq('round_id', roundId);
  if (error) throw toAppError(error, 'No se han podido cargar las respuestas.');
  return data;
}

export async function getSolution(roundId: string): Promise<Json | null> {
  const { data, error } = await supabase.from('game_round_secrets').select('solution').eq('round_id', roundId).maybeSingle();
  if (error) throw new AppError('No se ha podido cargar la solución.', { details: error });
  return data?.solution ?? null;
}
