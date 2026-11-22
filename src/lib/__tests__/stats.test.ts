import type { HistoryTrip } from '../history';
import { buildStats } from '../stats';

const trip = (id: string, myRole: string, car: string, distanceM: number, destinationName: string | null = null): HistoryTrip => ({
  id,
  date: '2026-11-20T12:00:00Z',
  car: { name: car, nfcCode: 'X', make: null, model: null, version: null, color: null, photoPath: null, imageUrl: null },
  driverName: 'Ana',
  iDrove: myRole === 'conductor',
  myRole,
  destinationName,
  distanceM,
  durationS: 600,
  companions: [],
  occupants: 2,
  totalCents: 0,
  myShareCents: 0,
  oweCents: 0,
  owedCents: 0,
  co2SavedKg: 0,
});

describe('buildStats', () => {
  const trips = [
    trip('1', 'conductor', 'Ibiza', 12_000),
    trip('2', 'copiloto', 'Ibiza', 80_000, 'Sevilla'),
    trip('3', 'pasajero', 'Clio', 5_000),
  ];
  const answers = [
    { game: 'probable', points: 10 },
    { game: 'trivial', points: 0 },
    { game: 'trivial', points: 100 },
    { game: 'dj', points: 0 },
  ];
  const songs = [
    { title: 'A', artist: 'Quevedo' },
    { title: 'B', artist: 'Rosalía' },
    { title: 'C', artist: 'Quevedo ' },
  ];
  const stats = buildStats(trips, answers, songs);

  it('cuántas veces de conductor, copiloto y pasajero', () => {
    expect(stats.roles).toEqual({ conductor: 1, copiloto: 1, pasajero: 1 });
  });
  it('coche favorito y viaje más largo', () => {
    expect(stats.favouriteCar).toEqual({ name: 'Ibiza', trips: 2 });
    expect(stats.longestTrip).toEqual({ distanceM: 80_000, title: 'A Sevilla', date: '2026-11-20T12:00:00Z' });
  });
  it('juegos: rondas jugadas, ganadas, puntos y favorito (sin contar DJ)', () => {
    expect(stats.games).toEqual({ played: 3, won: 2, points: 110, favourite: 'trivial' });
  });
  it('música: canciones puestas y artista más puesto', () => {
    expect(stats.music).toEqual({ songs: 3, topArtist: { name: 'Quevedo', songs: 2 } });
  });
  it('sin datos no hay favoritos', () => {
    expect(buildStats([], [], [])).toEqual({
      roles: { conductor: 0, copiloto: 0, pasajero: 0 },
      favouriteCar: null,
      longestTrip: null,
      games: { played: 0, won: 0, points: 0, favourite: null },
      music: { songs: 0, topArtist: null },
    });
  });
});
