import { hasErrors, parseConsumption, validateCarForm, type CarFormValues } from '../carForm';

describe('parseConsumption', () => {
  it('acepta coma o punto decimal', () => {
    expect(parseConsumption('6,5')).toBe(6.5);
    expect(parseConsumption('6.5')).toBe(6.5);
    expect(parseConsumption(' 7 ')).toBe(7);
  });

  it('redondea a un decimal', () => {
    expect(parseConsumption('5,46')).toBe(5.5);
  });

  it('devuelve null si no es un número', () => {
    expect(parseConsumption('abc')).toBeNull();
    expect(parseConsumption('')).toBeNull();
    expect(parseConsumption('-3')).toBeNull();
  });
});

describe('validateCarForm', () => {
  const valid: CarFormValues = { name: 'Ibiza', consumption: '6,5', fuelType: 'diesel', seats: 5 };

  it('un formulario correcto no tiene errores', () => {
    expect(hasErrors(validateCarForm(valid))).toBe(false);
  });

  it('marca cada campo inválido', () => {
    expect(validateCarForm({ ...valid, name: '  ' }).name).toBeDefined();
    expect(validateCarForm({ ...valid, name: 'x'.repeat(41) }).name).toBeDefined();
    expect(validateCarForm({ ...valid, consumption: '0' }).consumption).toBeDefined();
    expect(validateCarForm({ ...valid, consumption: '31' }).consumption).toBeDefined();
    expect(validateCarForm({ ...valid, fuelType: null }).fuelType).toBeDefined();
    expect(validateCarForm({ ...valid, seats: 1 }).seats).toBeDefined();
    expect(validateCarForm({ ...valid, seats: 10 }).seats).toBeDefined();
  });
});
