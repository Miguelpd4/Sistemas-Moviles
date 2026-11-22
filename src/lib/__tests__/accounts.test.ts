import { summarizeAccounts, type AccountPayment } from '../accounts';

const pay = (id: string, from: string, to: string, cents: number, status = 'pendiente', created = '2026-11-20', paidAt: string | null = null): AccountPayment => ({
  id,
  session_id: 's',
  from_user: from,
  to_user: to,
  amount_cents: cents,
  status,
  created_at: created,
  paid_at: paidAt,
});

describe('summarizeAccounts', () => {
  const others = pay('d', 'bea', 'ana', 999);
  const payments = [
    pay('a', 'yo', 'ana', 334, 'pendiente', '2026-11-20'),
    pay('b', 'bea', 'yo', 500, 'pendiente', '2026-11-22'),
    pay('c', 'yo', 'carlos', 200, 'pagado', '2026-11-18', '2026-11-19'),
    others,
  ];

  it('suma lo que debo y lo que me deben, solo lo pendiente', () => {
    const accounts = summarizeAccounts(payments, 'yo');
    expect(accounts.oweCents).toBe(334);
    expect(accounts.owedCents).toBe(500);
  });

  it('lista mis pendientes (los más recientes primero) y mis pagados', () => {
    const accounts = summarizeAccounts(payments, 'yo');
    expect(accounts.pending.map((p) => p.id)).toEqual(['b', 'a']);
    expect(accounts.paid.map((p) => p.id)).toEqual(['c']);
  });

  it('no mezcla pagos de otros y limita los pagados', () => {
    const many = Array.from({ length: 15 }, (_, i) => pay(`p${i}`, 'yo', 'ana', 100, 'pagado', `2026-11-${10 + i}`, `2026-11-${10 + i}`));
    const accounts = summarizeAccounts([...many, others], 'yo');
    expect(accounts.pending).toEqual([]);
    expect(accounts.paid).toHaveLength(10);
    expect(accounts.paid[0]?.id).toBe('p14');
  });
});
