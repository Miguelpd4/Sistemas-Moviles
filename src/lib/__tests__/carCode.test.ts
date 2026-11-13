import {
  CAR_CODE_ALPHABET,
  carStickerUrl,
  generateCarCode,
  hostOf,
  normalizeCarCode,
  parseCarCodeFromUrl,
} from '../carCode';

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

describe('parseCarCodeFromUrl', () => {
  const host = 'copi-uco.vercel.app';

  it('lee el código de una URL válida', () => {
    expect(parseCarCodeFromUrl('https://copi-uco.vercel.app/c/ABCD2345', host)).toBe('ABCD2345');
  });

  it('acepta la barra final', () => {
    expect(parseCarCodeFromUrl('https://copi-uco.vercel.app/c/ABCD2345/', host)).toBe('ABCD2345');
  });

  it('pasa el código a mayúsculas', () => {
    expect(parseCarCodeFromUrl('https://copi-uco.vercel.app/c/abcd2345', host)).toBe('ABCD2345');
  });

  it('acepta el host en mayúsculas', () => {
    expect(parseCarCodeFromUrl('https://COPI-UCO.vercel.app/c/ABCD2345', host)).toBe('ABCD2345');
  });

  it('rechaza otro host, http, otra ruta y códigos con símbolos', () => {
    expect(parseCarCodeFromUrl('https://otra.web/c/ABCD2345', host)).toBeNull();
    expect(parseCarCodeFromUrl('http://copi-uco.vercel.app/c/ABCD2345', host)).toBeNull();
    expect(parseCarCodeFromUrl('https://copi-uco.vercel.app/x/ABCD2345', host)).toBeNull();
    expect(parseCarCodeFromUrl('https://copi-uco.vercel.app/c/ABCD2345/extra', host)).toBeNull();
    expect(parseCarCodeFromUrl('https://copi-uco.vercel.app/c/AB$D2345', host)).toBeNull();
    expect(parseCarCodeFromUrl('no es una url', host)).toBeNull();
  });
});

describe('generateCarCode', () => {
  it('genera 8 caracteres del alfabeto sin caracteres confusos', () => {
    const code = generateCarCode();
    expect(code).toHaveLength(8);
    for (const char of code) expect(CAR_CODE_ALPHABET).toContain(char);
    expect(normalizeCarCode(code)).toBe(code);
  });

  it('con un random fijo da siempre el mismo código', () => {
    expect(generateCarCode(() => 0)).toBe('AAAAAAAA');
    expect(generateCarCode(() => 0.999999)).toBe('99999999');
    expect(generateCarCode(() => 0.5)).toBe(generateCarCode(() => 0.5));
  });
});

describe('carStickerUrl y hostOf', () => {
  it('construye la URL sin barras duplicadas', () => {
    expect(carStickerUrl('https://copi.app/', 'ABCD2345')).toBe('https://copi.app/c/ABCD2345');
  });

  it('saca el host de una URL', () => {
    expect(hostOf('https://Copi-UCO.vercel.app/c/X')).toBe('copi-uco.vercel.app');
    expect(hostOf('nada')).toBeNull();
  });
});
