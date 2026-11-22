import { toAppError } from '@/lib/errors';
import type { GameAnswerLite, SongLite } from '@/lib/stats';

import { supabase } from './client';

/** Estadísticas del Perfil (#34): mis respuestas en los juegos y las canciones que he puesto. */
export async function getMyGamesAndSongs(myId: string): Promise<{ answers: GameAnswerLite[]; songs: SongLite[] }> {
  const [answers, songs] = await Promise.all([
    supabase.from('game_answers').select('round_id, points').eq('user_id', myId).limit(1000),
    supabase.from('music_queue').select('title, artist').eq('added_by', myId).limit(1000),
  ]);
  if (answers.error) throw toAppError(answers.error, 'No se han podido cargar tus estadísticas.');
  if (songs.error) throw toAppError(songs.error, 'No se han podido cargar tus estadísticas.');

  const roundIds = [...new Set(answers.data.map((row) => row.round_id))];
  const games = new Map<string, string>();
  if (roundIds.length > 0) {
    const rounds = await supabase.from('game_rounds').select('id, game').in('id', roundIds);
    if (rounds.error) throw toAppError(rounds.error, 'No se han podido cargar tus estadísticas.');
    for (const row of rounds.data) games.set(row.id, row.game);
  }
  return {
    answers: answers.data.flatMap((row) => {
      const game = games.get(row.round_id);
      return game ? [{ game, points: row.points }] : [];
    }),
    songs: songs.data,
  };
}
