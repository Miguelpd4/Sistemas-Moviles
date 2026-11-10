import { formatEuros } from '../format';

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
