import { formatDuration, formatEuros, formatKm } from '../format';

describe('formatEuros', () => {
  it('formatea céntimos con coma decimal y símbolo de euro', () => {
    expect(formatEuros(1840)).toBe('18,40 €');
    expect(formatEuros(7360)).toBe('73,60 €');
  });

  it('rellena los decimales y maneja el cero', () => {
    expect(formatEuros(5)).toBe('0,05 €');
    expect(formatEuros(0)).toBe('0,00 €');
  });

  it('usa punto como separador de miles', () => {
    expect(formatEuros(123456789)).toBe('1.234.567,89 €');
  });

  it('formatea importes negativos', () => {
    expect(formatEuros(-1297)).toBe('-12,97 €');
  });

  it('rechaza importes no finitos', () => {
    expect(() => formatEuros(Number.NaN)).toThrow(RangeError);
  });
});

describe('formatKm', () => {
  it('usa metros por debajo de 1 km y km con un decimal por encima', () => {
    expect(formatKm(0)).toBe('0 m');
    expect(formatKm(950)).toBe('950 m');
    expect(formatKm(12_345)).toBe('12,3 km');
    expect(formatKm(1000)).toBe('1,0 km');
  });
});

describe('formatDuration', () => {
  it('formatea segundos, minutos y horas', () => {
    expect(formatDuration(59)).toBe('59 s');
    expect(formatDuration(480)).toBe('8 min');
    expect(formatDuration(3900)).toBe('1 h 05 min');
  });
});
