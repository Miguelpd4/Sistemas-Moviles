import { kindLabel, parseEurosToCents } from '../expenseForm';

describe('parseEurosToCents', () => {
  it.each([
    ['3', 300],
    ['3,5', 350],
    ['3.50', 350],
    ['12,30 €', 1230],
    [' 1000 ', 100_000],
  ])('«%s» → %i céntimos', (text, cents) => {
    expect(parseEurosToCents(text)).toBe(cents);
  });

  it('rechaza lo que no es un importe válido', () => {
    for (const text of ['', '0', '0,00', 'abc', '3,555', '-2', '1000,01', '10000']) {
      expect(parseEurosToCents(text)).toBeNull();
    }
  });
});

describe('kindLabel', () => {
  it('pone nombre a cada tipo de gasto', () => {
    expect(kindLabel('peaje')).toBe('Peaje');
    expect(kindLabel('combustible')).toBe('Gasolina');
    expect(kindLabel('raro')).toBe('Gasto');
  });
});
