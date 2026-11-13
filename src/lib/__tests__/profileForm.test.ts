import { isValidPhone, normalizePaypal, validateDriverForm, type DriverFormValues } from '../profileForm';

describe('validateDriverForm', () => {
  const valid: DriverFormValues = {
    email: 'ana@example.com',
    password: 'contraseña1',
    displayName: 'Ana',
    phone: '600 000 000',
    paypalUsername: '',
  };

  it('un registro correcto no tiene errores', () => {
    expect(validateDriverForm(valid, 'signup')).toEqual({});
  });

  it('pide 8 caracteres de contraseña al registrarse, pero no al entrar', () => {
    expect(validateDriverForm({ ...valid, password: 'corta' }, 'signup').password).toBeDefined();
    expect(validateDriverForm({ ...valid, password: 'corta' }, 'signin').password).toBeUndefined();
  });

  it('comprueba email, nombre, teléfono y PayPal', () => {
    expect(validateDriverForm({ ...valid, email: 'ana' }, 'signup').email).toBeDefined();
    expect(validateDriverForm({ ...valid, displayName: '' }, 'signup').displayName).toBeDefined();
    expect(validateDriverForm({ ...valid, phone: '123' }, 'signup').phone).toBeDefined();
    expect(validateDriverForm({ ...valid, paypalUsername: 'ana.garcia' }, 'signup').paypalUsername).toBeDefined();
  });
});

describe('teléfono y PayPal', () => {
  it('acepta teléfonos con espacios y prefijo', () => {
    expect(isValidPhone('+34 600 00 00 00')).toBe(true);
    expect(isValidPhone('600-000-000')).toBe(true);
    expect(isValidPhone('12345')).toBe(false);
  });

  it('se queda solo con el usuario de PayPal.me', () => {
    expect(normalizePaypal('https://paypal.me/ana123')).toBe('ana123');
    expect(normalizePaypal('paypal.me/ana123/')).toBe('ana123');
    expect(normalizePaypal(' ana123 ')).toBe('ana123');
  });
});
