import { render, screen } from '@testing-library/react-native';

import { rankStandings, type RankingRow } from '@/lib/ranking';

import { TripRanking } from '../TripRanking';

const row = (name: string, points: number): RankingRow => ({
  userId: name,
  name,
  avatarKind: 'preset',
  avatarValue: 'avatar-01',
  points,
  roundsWon: points > 0 ? 1 : 0,
});

describe('TripRanking', () => {
  it('destaca al ganador del viaje y enseña a todos, también con 0', async () => {
    await render(<TripRanking standings={rankStandings([row('Ana', 0), row('Carlos', 350), row('Bea', 250)])} error={null} final />);
    expect(screen.getByText('🏆 Ganador del viaje')).toBeTruthy();
    expect(screen.getByLabelText('Puesto 1: Carlos, 350 puntos')).toBeTruthy();
    expect(screen.getByLabelText('Puesto 3: Ana, 0 puntos')).toBeTruthy();
  });

  it('dice cuándo hay empate en cabeza', async () => {
    await render(<TripRanking standings={rankStandings([row('Ana', 100), row('Bea', 100)])} error={null} />);
    expect(screen.getByText('¡Empate en cabeza!')).toBeTruthy();
    expect(screen.getByText('Ana y Bea')).toBeTruthy();
    expect(screen.getByLabelText('Puesto 1, empate: Bea, 100 puntos')).toBeTruthy();
  });

  it('sin puntos todavía, anima a jugar', async () => {
    await render(<TripRanking standings={rankStandings([row('Ana', 0)])} error={null} />);
    expect(screen.getByText(/Nadie ha puntuado todavía/)).toBeTruthy();
  });
});
