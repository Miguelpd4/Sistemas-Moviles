import { buildHistory, co2SavedKg, groupByMonth, historyTotals, type HistoryCar, type HistoryMember, type HistorySession } from '../history';

const car: HistoryCar = {
  name: 'Ibiza',
  nfcCode: 'ABCD2345',
  make: 'SEAT',
  model: 'Ibiza',
  version: null,
  color: 'rojo',
  photoPath: null,
  imageUrl: null,
};

const session = (id: string, endedAt: string | null, startedAt: string | null = '2026-11-20T10:00:00Z'): HistorySession => ({
  id,
  startedAt,
  endedAt,
  createdAt: '2026-11-20T09:00:00Z',
  destinationName: id === 's1' ? 'Sevilla' : null,
  car,
});

const member = (sessionId: string, userId: string, name: string, role = 'pasajero'): HistoryMember => ({
  sessionId,
  userId,
  name,
  role,
  avatarKind: 'preset',
  avatarValue: 'avatar-01',
});

const input = {
  myId: 'me',
  sessions: [session('s1', '2026-11-20T12:00:00Z'), session('s2', '2026-11-22T18:40:00Z'), session('s3', '2026-11-21T10:00:00Z', null)],
  members: [
    member('s1', 'ana', 'Ana', 'conductor'),
    member('s1', 'me', 'Yo'),
    member('s1', 'bea', 'Bea'),
    member('s2', 'me', 'Yo', 'conductor'),
    member('s2', 'bea', 'Bea'),
  ],
  metrics: [
    { session_id: 's1', distance_m: 100_000, duration_s: 3600 },
    { session_id: 's2', distance_m: 20_000, duration_s: 1200 },
  ],
  expenses: [
    { session_id: 's1', kind: 'combustible', amount_cents: 900, paid_by: 'ana' },
    { session_id: 's1', kind: 'peaje', amount_cents: 300, paid_by: 'ana' },
    { session_id: 's2', kind: 'combustible', amount_cents: 400, paid_by: 'me' },
  ],
  payments: [
    { session_id: 's1', from_user: 'me', to_user: 'ana', amount_cents: 400, status: 'pendiente' },
    { session_id: 's1', from_user: 'bea', to_user: 'ana', amount_cents: 400, status: 'pagado' },
    { session_id: 's2', from_user: 'bea', to_user: 'me', amount_cents: 200, status: 'pendiente' },
  ],
};

describe('buildHistory', () => {
  const trips = buildHistory(input);

  it('solo los viajes que empezaron, del más reciente al más antiguo', () => {
    expect(trips.map((trip) => trip.id)).toEqual(['s2', 's1']);
  });

  it('quién conducía, con quién fui y el destino', () => {
    const [s2, s1] = trips;
    expect(s1?.driverName).toBe('Ana');
    expect(s1?.iDrove).toBe(false);
    expect(s1?.destinationName).toBe('Sevilla');
    expect(s1?.companions.map((p) => p.name)).toEqual(['Ana', 'Bea']);
    expect(s2?.iDrove).toBe(true);
    expect(s2?.companions.map((p) => p.name)).toEqual(['Bea']);
  });

  it('mi parte y lo que queda pendiente', () => {
    const [s2, s1] = trips;
    expect(s1?.totalCents).toBe(1200);
    expect(s1?.myShareCents).toBe(400);
    expect(s1?.oweCents).toBe(400);
    expect(s1?.owedCents).toBe(0);
    expect(s2?.myShareCents).toBe(200);
    expect(s2?.owedCents).toBe(200);
  });

  it('distancia, tiempo y CO₂ ahorrado', () => {
    const s1 = trips[1];
    expect(s1?.distanceM).toBe(100_000);
    expect(s1?.durationS).toBe(3600);
    expect(s1?.co2SavedKg).toBe(24);
  });
});

describe('co2SavedKg', () => {
  it('cada ocupante de más es un coche menos', () => {
    expect(co2SavedKg(100_000, 1)).toBe(0);
    expect(co2SavedKg(100_000, 2)).toBe(12);
    expect(co2SavedKg(12_345, 4)).toBe(4.4);
  });
});

describe('historyTotals', () => {
  it('suma viajes, km, tiempo, gasto y CO₂', () => {
    const totals = historyTotals(buildHistory(input));
    expect(totals).toEqual({
      trips: 2,
      distanceM: 120_000,
      durationS: 4800,
      spentCents: 600,
      co2SavedKg: 26.4,
      topCompanion: { name: 'Bea', trips: 2 },
    });
  });
  it('sin viajes, todo a cero', () => {
    expect(historyTotals([])).toEqual({ trips: 0, distanceM: 0, durationS: 0, spentCents: 0, co2SavedKg: 0, topCompanion: null });
  });
});

describe('groupByMonth', () => {
  it('agrupa por mes con su nombre en español', () => {
    const trips = buildHistory({
      ...input,
      sessions: [session('s1', '2026-11-20T12:00:00Z'), session('s2', '2026-10-05T12:00:00Z')],
    });
    expect(groupByMonth(trips).map((group) => [group.label, group.trips.length])).toEqual([
      ['noviembre de 2026', 1],
      ['octubre de 2026', 1],
    ]);
  });
});
