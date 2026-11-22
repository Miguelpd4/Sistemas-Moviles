import type { HistoryTrip } from './history';

/**
 * Estadísticas del Perfil (#34), con mis viajes terminados (historial), mis respuestas en los
 * juegos y las canciones que he puesto. Funciones puras.
 */

export type GameAnswerLite = { game: string; points: number };
export type SongLite = { title: string; artist: string };

export type MyStats = {
  roles: { conductor: number; copiloto: number; pasajero: number };
  favouriteCar: { name: string; trips: number } | null;
  longestTrip: { distanceM: number; title: string; date: string } | null;
  games: { played: number; won: number; points: number; favourite: string | null };
  music: { songs: number; topArtist: { name: string; songs: number } | null };
};

/** El que más se repite (en caso de empate, el primero que aparece). */
function top(values: readonly string[]): { value: string; count: number } | null {
  const counts = new Map<string, number>();
  for (const value of values) counts.set(value, (counts.get(value) ?? 0) + 1);
  let best: { value: string; count: number } | null = null;
  for (const [value, count] of counts) if (best === null || count > best.count) best = { value, count };
  return best;
}

export function buildStats(trips: readonly HistoryTrip[], answers: readonly GameAnswerLite[], songs: readonly SongLite[]): MyStats {
  const roles = { conductor: 0, copiloto: 0, pasajero: 0 };
  for (const trip of trips) {
    if (trip.myRole === 'conductor' || trip.myRole === 'copiloto') roles[trip.myRole] += 1;
    else roles.pasajero += 1;
  }
  const car = top(trips.map((trip) => trip.car.name));
  const longest = trips.reduce<HistoryTrip | null>((best, trip) => (best === null || trip.distanceM > best.distanceM ? trip : best), null);
  // DJ no es un juego de puntos: no cuenta para el favorito.
  const played = answers.filter((answer) => answer.game !== 'dj');
  const game = top(played.map((answer) => answer.game));
  const artist = top(songs.map((song) => song.artist.trim()).filter((name) => name !== ''));
  return {
    roles,
    favouriteCar: car && car.count > 1 ? { name: car.value, trips: car.count } : null,
    longestTrip:
      longest && longest.distanceM > 0
        ? {
            distanceM: longest.distanceM,
            title: longest.destinationName ? `A ${longest.destinationName}` : `En el ${longest.car.name}`,
            date: longest.date,
          }
        : null,
    games: {
      played: played.length,
      won: played.filter((answer) => answer.points > 0).length,
      points: answers.reduce((sum, answer) => sum + answer.points, 0),
      favourite: game?.value ?? null,
    },
    music: { songs: songs.length, topArtist: artist ? { name: artist.value, songs: artist.count } : null },
  };
}
