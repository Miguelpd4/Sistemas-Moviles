import { bizumText, paypalMeUrl, plainAmount } from '../payLinks';

describe('payLinks', () => {
  it('pone el importe con punto y dos decimales', () => {
    expect(plainAmount(334)).toBe('3.34');
    expect(plainAmount(1000)).toBe('10.00');
    expect(plainAmount(-5)).toBe('0.00');
  });
  it('arma el enlace de PayPal.me solo con un usuario válido', () => {
    expect(paypalMeUrl('anaCopi', 334)).toBe('https://paypal.me/anaCopi/3.34EUR');
    expect(paypalMeUrl(null, 334)).toBeNull();
    expect(paypalMeUrl('no vale', 334)).toBeNull();
  });
  it('prepara el texto de Bizum con teléfono e importe', () => {
    expect(bizumText('600 123 123', 333)).toBe('600123123 · 3,33 €');
    expect(bizumText('', 333)).toBeNull();
  });
});
