/** Cuentas (#28): lo que debo y lo que me deben de todos los viajes. */

export type AccountPayment = {
  id: string;
  session_id: string;
  from_user: string;
  to_user: string;
  amount_cents: number;
  status: string;
  created_at: string;
  paid_at: string | null;
};

export type Accounts<T extends AccountPayment> = {
  /** Lo que tengo pendiente de pagar. */
  oweCents: number;
  /** Lo que me tienen pendiente de pagar. */
  owedCents: number;
  /** Pagos pendientes donde estoy, los más recientes primero. */
  pending: T[];
  /** Los últimos pagados (como mucho `paidLimit`). */
  paid: T[];
};

export function summarizeAccounts<T extends AccountPayment>(payments: readonly T[], myId: string, paidLimit = 10): Accounts<T> {
  const mine = payments.filter((p) => p.from_user === myId || p.to_user === myId);
  const pending = mine.filter((p) => p.status !== 'pagado').sort((a, b) => b.created_at.localeCompare(a.created_at));
  const paid = mine
    .filter((p) => p.status === 'pagado')
    .sort((a, b) => (b.paid_at ?? b.created_at).localeCompare(a.paid_at ?? a.created_at))
    .slice(0, paidLimit);
  return {
    oweCents: pending.filter((p) => p.from_user === myId).reduce((sum, p) => sum + p.amount_cents, 0),
    owedCents: pending.filter((p) => p.to_user === myId).reduce((sum, p) => sum + p.amount_cents, 0),
    pending,
    paid,
  };
}
