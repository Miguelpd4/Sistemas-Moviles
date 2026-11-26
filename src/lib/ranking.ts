/**
 * Ranking general del viaje (#33): los puntos de todas las partidas puntuadas, por persona. Los
 * totales los suma la RPC trip_ranking; aquí se ordenan, se reparten las posiciones con empates
 * (1, 1, 3…) y se decide quién gana.
 */

export type RankingRow = {
  userId: string;
  name: string;
  avatarKind: string;
  avatarValue: string;
  points: number;
  roundsWon: number;
};

export type RankedRow = RankingRow & {
  /** Posición con empates: dos primeros empatados son 1 y 1, y el siguiente, 3. */
  position: number;
  tied: boolean;
  winner: boolean;
};

export type Standings = {
  rows: RankedRow[];
  /** Quienes van primeros con más de 0 puntos (varios si hay empate). */
  winners: RankedRow[];
  /** ¿Alguien ha sumado algo ya? */
  anyPoints: boolean;
};

export function rankStandings(input: readonly RankingRow[]): Standings {
  const sorted = [...input].sort((a, b) => b.points - a.points || b.roundsWon - a.roundsWon || a.name.localeCompare(b.name, 'es'));
  const count = new Map<number, number>();
  for (const row of sorted) count.set(row.points, (count.get(row.points) ?? 0) + 1);
  const top = sorted[0]?.points ?? 0;
  const rows = sorted.map((row): RankedRow => {
    const position = sorted.findIndex((other) => other.points === row.points) + 1;
    return { ...row, position, tied: (count.get(row.points) ?? 0) > 1, winner: top > 0 && row.points === top };
  });
  return { rows, winners: rows.filter((row) => row.winner), anyPoints: top > 0 };
}

/** «Carlos», «Carlos y Ana» o «Carlos, Ana y Bea». */
export function joinNames(names: readonly string[]): string {
  if (names.length <= 1) return names[0] ?? '';
  return `${names.slice(0, -1).join(', ')} y ${names[names.length - 1] ?? ''}`;
}

/** Medalla para los tres primeros puestos. */
export function medal(position: number): string | null {
  return position === 1 ? '🥇' : position === 2 ? '🥈' : position === 3 ? '🥉' : null;
}
