import { tripMoney } from '../tripMoney';

const ANA = '11111111-1111-1111-1111-111111111111';
const BEA = '22222222-2222-2222-2222-222222222222';
const CARLOS = '33333333-3333-3333-3333-333333333333';

describe('tripMoney', () => {
  // El mismo caso que la prueba pgTAP reparto.test.sql: 10,01 € de gasolina entre tres.
  const expenses = [{ kind: 'combustible', amount_cents: 1001, paid_by: ANA }];
  const payments = [
    { from_user: BEA, to_user: ANA, amount_cents: 334, status: 'pendiente' },
    { from_user: CARLOS, to_user: ANA, amount_cents: 333, status: 'pendiente' },
  ];

  it('reparte igual que end_trip: el céntimo que sobra a los primeros por id', () => {
    const money = tripMoney(expenses, payments, [CARLOS, BEA, ANA], BEA);
    expect(money.totalCents).toBe(1001);
    expect(money.fuelCents).toBe(1001);
    expect(money.extrasCents).toBe(0);
    expect(money.shares).toEqual({ [ANA]: 334, [BEA]: 334, [CARLOS]: 333 });
    expect(money.payments).toEqual(payments);
  });

  it('separa lo que pago y lo que cobro', () => {
    expect(tripMoney(expenses, payments, [ANA, BEA, CARLOS], BEA).iPay).toEqual([payments[0]]);
    expect(tripMoney(expenses, payments, [ANA, BEA, CARLOS], ANA).iReceive).toEqual(payments);
    expect(tripMoney(expenses, payments, [ANA, BEA, CARLOS], ANA).iPay).toEqual([]);
    expect(tripMoney(expenses, payments, [ANA, BEA, CARLOS], null).iPay).toEqual([]);
  });

  it('cuenta los extras y a quien pagó aunque ya no esté dentro', () => {
    const money = tripMoney([...expenses, { kind: 'peaje', amount_cents: 299, paid_by: 'zz-se-fue' }], [], [ANA, BEA], null);
    expect(money.extrasCents).toBe(299);
    expect(Object.keys(money.shares)).toEqual([ANA, BEA, 'zz-se-fue']);
    expect(Object.values(money.shares).reduce((a, b) => a + b, 0)).toBe(1300);
  });

  it('sin gastos, nada que repartir', () => {
    expect(tripMoney([], [], [ANA, BEA], ANA)).toMatchObject({ totalCents: 0, iPay: [], iReceive: [] });
  });
});
