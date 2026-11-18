import { averageSpeedKmh, canFinish, fuelCacheKey } from '../tripStatus';
import { formatDuration, formatKm } from '../format';

describe('canFinish', () => {
  const now = 100_000;
  it('parado: sí', () => {
    expect(canFinish({ speedMps: 0.4, timestamp: now - 2_000 }, now)).toBe(true);
  });
  it('en marcha: no', () => {
    expect(canFinish({ speedMps: 13, timestamp: now - 2_000 }, now)).toBe(false);
  });
  it('sin puntos recientes: sí', () => {
    expect(canFinish({ speedMps: 13, timestamp: now - 25_000 }, now)).toBe(true);
  });
  it('sin ningún punto: sí', () => {
    expect(canFinish(null, now)).toBe(true);
  });
});

describe('formatos del viaje', () => {
  it('formatKm', () => {
    expect(formatKm(0)).toBe('0 m');
    expect(formatKm(950)).toBe('950 m');
    expect(formatKm(12_345)).toBe('12,3 km');
  });
  it('formatDuration', () => {
    expect(formatDuration(59)).toBe('59 s');
    expect(formatDuration(480)).toBe('8 min');
    expect(formatDuration(3_900)).toBe('1 h 05 min');
  });
  it('velocidad media y clave de caché', () => {
    expect(averageSpeedKmh(10_000, 600)).toBe(60);
    expect(averageSpeedKmh(100, 30)).toBeNull();
    expect(fuelCacheKey('diesel', 37.8847, -4.7791)).toBe('diesel:37.9,-4.8');
  });
});

import { formatFuelPrice, parseFuelPrice } from '../tripStatus';

describe('precio del combustible', () => {
  it('acepta coma o punto y rechaza lo absurdo', () => {
    expect(parseFuelPrice('1,559')).toBe(1.559);
    expect(parseFuelPrice(' 1.6 ')).toBe(1.6);
    expect(parseFuelPrice('0')).toBeNull();
    expect(parseFuelPrice('9')).toBeNull();
    expect(parseFuelPrice('abc')).toBeNull();
    expect(formatFuelPrice(1.5)).toBe('1,500');
  });
});

