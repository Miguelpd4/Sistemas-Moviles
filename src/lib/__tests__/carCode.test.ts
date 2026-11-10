import { normalizeCarCode } from '../carCode';

describe('normalizeCarCode', () => {
  it('pasa el código a mayúsculas y quita espacios', () => {
    expect(normalizeCarCode(' ab12cd ')).toBe('AB12CD');
  });

  it('toma el primer valor si llega un array', () => {
    expect(normalizeCarCode(['XYZ123', 'otro'])).toBe('XYZ123');
  });

  it('devuelve null si falta o no es válido', () => {
    expect(normalizeCarCode(undefined)).toBeNull();
    expect(normalizeCarCode('')).toBeNull();
    expect(normalizeCarCode('abc')).toBeNull();
    expect(normalizeCarCode('ab-12')).toBeNull();
    expect(normalizeCarCode('A'.repeat(13))).toBeNull();
  });
});
