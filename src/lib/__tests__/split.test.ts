import { haversineM, totalDistanceM, type GeoPoint } from '../distance';
import { settleDebts } from '../settle';
import { fuelCostCents, splitEqually } from '../split';

describe('fuelCostCents', () => {
  it('120 km a 6,5 L/100 km y 1,559 €/L son 12,16 €', () => {
    expect(fuelCostCents(120_000, 6.5, 1.559)).toBe(1216);
  });

  it('sin distancia no hay coste', () => {
    expect(fuelCostCents(0, 6.5, 1.559)).toBe(0);
  });
});

describe('splitEqually', () => {
  it('reparte a partes iguales', () => {
    expect(splitEqually(1840, ['a', 'b', 'c', 'd'])).toEqual({ a: 460, b: 460, c: 460, d: 460 });
  });

  it('los primeros se llevan el céntimo sobrante', () => {
    expect(splitEqually(1000, ['a', 'b', 'c'])).toEqual({ a: 334, b: 333, c: 333 });
  });

  it('con 0 todos pagan 0', () => {
    expect(splitEqually(0, ['a', 'b', 'c'])).toEqual({ a: 0, b: 0, c: 0 });
  });

  it('la suma es siempre el total', () => {
    for (const total of [1, 7, 1566, 99_999]) {
      const parts = splitEqually(total, ['a', 'b', 'c', 'd', 'e', 'f', 'g']);
      expect(Object.values(parts).reduce((x, y) => x + y, 0)).toBe(total);
    }
  });
});

describe('settleDebts', () => {
  it('tres pasajeros pagan su parte al conductor', () => {
    const transfers = settleDebts([
      { userId: 'conductor', balanceCents: 1380 },
      { userId: 'p1', balanceCents: -460 },
      { userId: 'p2', balanceCents: -460 },
      { userId: 'p3', balanceCents: -460 },
    ]);
    expect(transfers).toEqual([
      { from: 'p1', to: 'conductor', amountCents: 460 },
      { from: 'p2', to: 'conductor', amountCents: 460 },
      { from: 'p3', to: 'conductor', amountCents: 460 },
    ]);
  });

  it('el que más debe paga primero', () => {
    expect(
      settleDebts([
        { userId: 'conductor', balanceCents: 1800 },
        { userId: 'B', balanceCents: -600 },
        { userId: 'C', balanceCents: -1200 },
      ]),
    ).toEqual([
      { from: 'C', to: 'conductor', amountCents: 1200 },
      { from: 'B', to: 'conductor', amountCents: 600 },
    ]);
  });

  it('sin deudas no hay pagos', () => {
    expect(settleDebts([{ userId: 'a', balanceCents: 0 }, { userId: 'b', balanceCents: 0 }])).toEqual([]);
  });

  it('rechaza saldos que no suman cero', () => {
    expect(() => settleDebts([{ userId: 'a', balanceCents: 5 }])).toThrow(RangeError);
  });
});

describe('distancia', () => {
  it('Córdoba a Sevilla en línea recta mide unos 119,7 km', () => {
    const meters = haversineM({ lat: 37.8882, lon: -4.7794 }, { lat: 37.3891, lon: -5.9845 });
    expect(meters).toBeGreaterThan(119_150);
    expect(meters).toBeLessThan(120_350);
  });

  const at = (lat: number, seconds: number, accuracy = 5): GeoPoint => ({
    lat,
    lon: -4.7794,
    accuracy,
    timestamp: seconds * 1000,
  });

  it('suma los tramos válidos', () => {
    // 0,001° de latitud son unos 111 m
    expect(totalDistanceM([at(37.888, 0), at(37.889, 10), at(37.89, 20)])).toBe(222);
  });

  it('ignora los puntos con mala precisión', () => {
    expect(totalDistanceM([at(37.888, 0), at(37.95, 10, 120), at(37.889, 20)])).toBe(111);
  });

  it('ignora los saltos imposibles', () => {
    // 0,045° son unos 5 km en 5 segundos
    expect(totalDistanceM([at(37.888, 0), at(37.933, 5), at(37.889, 10)])).toBe(111);
  });
});
