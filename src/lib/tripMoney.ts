import { splitEqually } from './split';

/** Resumen del dinero de un viaje (#25) a partir de los gastos y los pagos que crea end_trip. */

export type MoneyExpense = { kind: string; amount_cents: number; paid_by: string };
export type MoneyPayment = { id?: string; from_user: string; to_user: string; amount_cents: number; status: string };

export type TripMoney = {
  totalCents: number;
  fuelCents: number;
  extrasCents: number;
  /** Lo que le toca a cada uno (a partes iguales, como el reparto de end_trip). */
  shares: Record<string, number>;
  /** Todos los pagos del viaje (quién paga a quién). */
  payments: MoneyPayment[];
  /** Lo que yo tengo que pagar y a quién (pendiente o ya pagado). */
  iPay: MoneyPayment[];
  /** Lo que me tienen que pagar. */
  iReceive: MoneyPayment[];
};

/**
 * `participants`: los que iban al final del viaje. El reparto usa el mismo orden que end_trip
 * (por id) para que el céntimo que sobra caiga en las mismas personas.
 */
export function tripMoney(
  expenses: readonly MoneyExpense[],
  payments: readonly MoneyPayment[],
  participants: readonly string[],
  myId: string | null,
): TripMoney {
  const fuelCents = expenses.filter((e) => e.kind === 'combustible').reduce((sum, e) => sum + e.amount_cents, 0);
  const totalCents = expenses.reduce((sum, e) => sum + e.amount_cents, 0);
  const people = [...new Set([...participants, ...expenses.map((e) => e.paid_by)])].sort();
  return {
    totalCents,
    fuelCents,
    extrasCents: totalCents - fuelCents,
    shares: splitEqually(totalCents, people),
    payments: [...payments],
    iPay: myId === null ? [] : payments.filter((p) => p.from_user === myId),
    iReceive: myId === null ? [] : payments.filter((p) => p.to_user === myId),
  };
}
