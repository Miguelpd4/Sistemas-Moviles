import { tripMoney, type MoneyExpense, type MoneyPayment } from './tripMoney';

/**
 * Historial de viajes (#34): mis viajes terminados con quién fui, cuánto recorrimos, lo que me
 * tocó pagar y si queda algo pendiente. Funciones puras: los datos los trae useHistory.
 */

/** Emisiones medias de un turismo en España, en kg de CO₂ por km (unos 120 g/km). */
export const CO2_KG_PER_KM = 0.12;

export type HistoryCar = {
  name: string;
  nfcCode: string;
  make: string | null;
  model: string | null;
  version: string | null;
  color: string | null;
  photoPath: string | null;
  imageUrl: string | null;
};

export type HistorySession = {
  id: string;
  startedAt: string | null;
  endedAt: string | null;
  createdAt: string;
  destinationName: string | null;
  car: HistoryCar;
};

export type HistoryMember = {
  sessionId: string;
  userId: string;
  name: string;
  role: string;
  avatarKind: string;
  avatarValue: string;
};

export type HistoryPerson = { id: string; name: string; avatarKind: string; avatarValue: string };

export type HistoryTrip = {
  id: string;
  /** Cuándo terminó (o empezó, si no consta el final). */
  date: string;
  car: HistoryCar;
  driverName: string;
  iDrove: boolean;
  destinationName: string | null;
  distanceM: number;
  durationS: number;
  /** Los demás que iban (sin mí). */
  companions: HistoryPerson[];
  occupants: number;
  totalCents: number;
  myShareCents: number;
  /** Lo que aún debo y lo que aún me deben de este viaje. */
  oweCents: number;
  owedCents: number;
  co2SavedKg: number;
};

/**
 * CO₂ que se ahorra al compartir coche: cada ocupante de más es un coche menos en la carretera.
 * Redondeado a 0,1 kg.
 */
export function co2SavedKg(distanceM: number, occupants: number): number {
  const extra = Math.max(0, occupants - 1);
  return Math.round(((distanceM / 1000) * CO2_KG_PER_KM * extra) * 10) / 10;
}

type Input = {
  myId: string;
  sessions: readonly HistorySession[];
  members: readonly HistoryMember[];
  metrics: readonly { session_id: string; distance_m: number; duration_s: number }[];
  expenses: readonly (MoneyExpense & { session_id: string })[];
  payments: readonly (MoneyPayment & { session_id: string })[];
};

/** Junta todo en una tarjeta por viaje, del más reciente al más antiguo. Los que no llegaron a salir no cuentan. */
export function buildHistory({ myId, sessions, members, metrics, expenses, payments }: Input): HistoryTrip[] {
  return sessions
    .filter((session) => session.startedAt !== null)
    .map((session): HistoryTrip => {
      const people = members.filter((member) => member.sessionId === session.id);
      const driver = people.find((member) => member.role === 'conductor');
      const metric = metrics.find((row) => row.session_id === session.id);
      const tripExpenses = expenses.filter((row) => row.session_id === session.id);
      const tripPayments = payments.filter((row) => row.session_id === session.id);
      const money = tripMoney(
        tripExpenses,
        tripPayments,
        people.map((member) => member.userId),
        myId,
      );
      const distanceM = metric?.distance_m ?? 0;
      const pending = (list: readonly MoneyPayment[]) =>
        list.filter((payment) => payment.status !== 'pagado').reduce((sum, payment) => sum + payment.amount_cents, 0);
      return {
        id: session.id,
        date: session.endedAt ?? session.startedAt ?? session.createdAt,
        car: session.car,
        driverName: driver?.name ?? 'el conductor',
        iDrove: driver?.userId === myId,
        destinationName: session.destinationName,
        distanceM,
        durationS: metric?.duration_s ?? 0,
        companions: people
          .filter((member) => member.userId !== myId)
          .map((member) => ({ id: member.userId, name: member.name, avatarKind: member.avatarKind, avatarValue: member.avatarValue })),
        occupants: people.length,
        totalCents: money.totalCents,
        myShareCents: money.shares[myId] ?? 0,
        oweCents: pending(money.iPay),
        owedCents: pending(money.iReceive),
        co2SavedKg: co2SavedKg(distanceM, people.length),
      };
    })
    .sort((a, b) => b.date.localeCompare(a.date));
}

export type HistoryTotals = {
  trips: number;
  distanceM: number;
  durationS: number;
  /** Lo que me ha tocado pagar en total (mi parte de cada viaje). */
  spentCents: number;
  co2SavedKg: number;
  /** Con quién he viajado más veces. */
  topCompanion: { name: string; trips: number } | null;
};

export function historyTotals(trips: readonly HistoryTrip[]): HistoryTotals {
  const counts = new Map<string, { name: string; trips: number }>();
  for (const trip of trips) {
    for (const person of trip.companions) {
      const current = counts.get(person.id);
      counts.set(person.id, { name: person.name, trips: (current?.trips ?? 0) + 1 });
    }
  }
  const topCompanion = [...counts.values()].sort((a, b) => b.trips - a.trips)[0] ?? null;
  return {
    trips: trips.length,
    distanceM: trips.reduce((sum, trip) => sum + trip.distanceM, 0),
    durationS: trips.reduce((sum, trip) => sum + trip.durationS, 0),
    spentCents: trips.reduce((sum, trip) => sum + trip.myShareCents, 0),
    co2SavedKg: Math.round(trips.reduce((sum, trip) => sum + trip.co2SavedKg, 0) * 10) / 10,
    topCompanion: topCompanion && topCompanion.trips > 1 ? topCompanion : null,
  };
}

const MONTHS = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];

/** Agrupa por mes («noviembre de 2026»), en el orden en que vienen. */
export function groupByMonth(trips: readonly HistoryTrip[]): { key: string; label: string; trips: HistoryTrip[] }[] {
  const groups: { key: string; label: string; trips: HistoryTrip[] }[] = [];
  for (const trip of trips) {
    const date = new Date(trip.date);
    const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    let group = groups.find((item) => item.key === key);
    if (!group) {
      group = { key, label: `${MONTHS[date.getMonth()] ?? ''} de ${date.getFullYear()}`, trips: [] };
      groups.push(group);
    }
    group.trips.push(trip);
  }
  return groups;
}

/** «sáb 22 nov · 18:40». */
export function tripDateLabel(iso: string): string {
  const date = new Date(iso);
  const day = date.toLocaleDateString('es-ES', { weekday: 'short', day: 'numeric', month: 'short' }).replace(/\./g, '');
  const time = date.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
  return `${day} · ${time}`;
}
