import { joinNames, medal, rankStandings, type RankingRow } from '../ranking';

const row = (name: string, points: number, roundsWon = points > 0 ? 1 : 0): RankingRow => ({
  userId: name.toLowerCase(),
  name,
  avatarKind: 'preset',
  avatarValue: 'avatar-01',
  points,
  roundsWon,
});

describe('rankStandings', () => {
  it('ordena de más a menos puntos y destaca al ganador', () => {
    const { rows, winners, anyPoints } = rankStandings([row('Pedro', 180), row('Carlos', 350), row('Laura', 100), row('Ana', 250)]);
    expect(rows.map((r) => [r.position, r.name, r.points])).toEqual([
      [1, 'Carlos', 350],
      [2, 'Ana', 250],
      [3, 'Pedro', 180],
      [4, 'Laura', 100],
    ]);
    expect(winners.map((r) => r.name)).toEqual(['Carlos']);
    expect(anyPoints).toBe(true);
  });

  it('los empates comparten puesto y el siguiente salta', () => {
    const { rows, winners } = rankStandings([row('Ana', 100, 2), row('Bea', 100, 2), row('Carlos', 40)]);
    expect(rows.map((r) => [r.position, r.name, r.tied])).toEqual([
      [1, 'Ana', true],
      [1, 'Bea', true],
      [3, 'Carlos', false],
    ]);
    expect(winners.map((r) => r.name)).toEqual(['Ana', 'Bea']);
  });

  it('salen también quienes tienen 0 puntos, y sin puntos no hay ganador', () => {
    const { rows, winners, anyPoints } = rankStandings([row('Ana', 0), row('Bea', 0)]);
    expect(rows).toHaveLength(2);
    expect(rows.every((r) => r.position === 1 && !r.winner)).toBe(true);
    expect(winners).toEqual([]);
    expect(anyPoints).toBe(false);
  });

  it('con ranking vacío no falla', () => {
    expect(rankStandings([])).toEqual({ rows: [], winners: [], anyPoints: false });
  });
});

describe('textos', () => {
  it('une nombres y pone medallas', () => {
    expect(joinNames(['Carlos'])).toBe('Carlos');
    expect(joinNames(['Carlos', 'Ana'])).toBe('Carlos y Ana');
    expect(joinNames(['Carlos', 'Ana', 'Bea'])).toBe('Carlos, Ana y Bea');
    expect([1, 2, 3, 4].map(medal)).toEqual(['🥇', '🥈', '🥉', null]);
  });
});
