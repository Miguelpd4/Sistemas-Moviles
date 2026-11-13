/**
 * Pagos mínimos para saldar cuentas. El saldo de cada persona es lo que pagó menos lo que le toca:
 * positivo = tiene que cobrar, negativo = tiene que pagar.
 * Mismo algoritmo que `end_trip` en SQL: el que más debe paga al que más tiene que cobrar,
 * y los empates se ordenan por `userId`, para que el resultado sea siempre el mismo.
 */
export type Balance = { userId: string; balanceCents: number };
export type Transfer = { from: string; to: string; amountCents: number };

const byUserId = (a: Balance, b: Balance) => (a.userId < b.userId ? -1 : a.userId > b.userId ? 1 : 0);

export function settleDebts(balances: readonly Balance[]): Transfer[] {
  const sum = balances.reduce((acc, b) => acc + b.balanceCents, 0);
  if (sum !== 0) throw new RangeError(`Los saldos no suman cero (${sum})`);

  const working = balances.map((b) => ({ ...b }));
  const transfers: Transfer[] = [];

  for (;;) {
    const debtor = working
      .filter((b) => b.balanceCents < 0)
      .sort((a, b) => a.balanceCents - b.balanceCents || byUserId(a, b))[0];
    const creditor = working
      .filter((b) => b.balanceCents > 0)
      .sort((a, b) => b.balanceCents - a.balanceCents || byUserId(a, b))[0];
    if (!debtor || !creditor) break;

    const amount = Math.min(-debtor.balanceCents, creditor.balanceCents);
    transfers.push({ from: debtor.userId, to: creditor.userId, amountCents: amount });
    debtor.balanceCents += amount;
    creditor.balanceCents -= amount;
  }
  return transfers;
}
