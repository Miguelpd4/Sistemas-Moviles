import {
  challengeExample,
  challengeKey,
  describeChallenge,
  formatPlate,
  normalizePlate,
  pickChallenge,
  plateMatches,
  pointsForPosition,
  readPlateAnswer,
  readPlateChallenge,
  type PlateChallenge,
} from '../matriculas';

/** Generador repetible para las pruebas. */
function seeded(seed: number) {
  let s = seed;
  return () => {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

describe('normalizePlate', () => {
  it('acepta espacios, guiones y minúsculas', () => {
    expect(normalizePlate('1234 bcd')).toBe('1234BCD');
    expect(normalizePlate(' 1234-KMB ')).toBe('1234KMB');
  });
  it('rechaza vocales, Ñ, Q, formatos antiguos y longitudes raras', () => {
    expect(normalizePlate('1234 ABC')).toBeNull();
    expect(normalizePlate('1234 BCQ')).toBeNull();
    expect(normalizePlate('CO-1234-AB')).toBeNull();
    expect(normalizePlate('123 BCD')).toBeNull();
  });
  it('formatPlate pone el espacio', () => {
    expect(formatPlate('1234BCD')).toBe('1234 BCD');
  });
});

describe('plateMatches (igual que plate_matches en SQL)', () => {
  it('letras: las dos, en cualquier orden', () => {
    const c: PlateChallenge = { kind: 'letras', letters: ['K', 'M'] };
    expect(plateMatches(c, '1234MKB')).toBe(true);
    expect(plateMatches(c, '1234KBB')).toBe(false);
  });
  it('suma de los números', () => {
    expect(plateMatches({ kind: 'suma', total: 20 }, '5582BCD')).toBe(true);
    expect(plateMatches({ kind: 'suma', total: 20 }, '5581BCD')).toBe(false);
  });
  it('empieza por la letra y el número acaba en par', () => {
    expect(plateMatches({ kind: 'empieza', letter: 'L' }, '1236LBC')).toBe(true);
    expect(plateMatches({ kind: 'empieza', letter: 'L' }, '1237LBC')).toBe(false);
    expect(plateMatches({ kind: 'empieza', letter: 'L' }, '1236BLC')).toBe(false);
  });
  it('repite la cifra dos veces o más', () => {
    expect(plateMatches({ kind: 'repite', digit: '7' }, '7172BCD')).toBe(true);
    expect(plateMatches({ kind: 'repite', digit: '7' }, '7777BCD')).toBe(true);
    expect(plateMatches({ kind: 'repite', digit: '7' }, '7123BCD')).toBe(false);
  });
  it('una matrícula no válida nunca cumple', () => {
    expect(plateMatches({ kind: 'suma', total: 10 }, '1234ABC')).toBe(false);
  });
});

describe('pickChallenge', () => {
  it('cada reto tiene un ejemplo que lo cumple y una frase', () => {
    const random = seeded(7);
    for (let i = 0; i < 200; i += 1) {
      const challenge = pickChallenge(random);
      const example = normalizePlate(challengeExample(challenge));
      expect(example).not.toBeNull();
      expect(plateMatches(challenge, example ?? '')).toBe(true);
      expect(describeChallenge(challenge)).toMatch(/^Una matrícula/);
    }
  });
  it('evita los retos ya jugados', () => {
    const random = seeded(3);
    const used = new Set<string>();
    for (let i = 0; i < 15; i += 1) used.add(challengeKey(pickChallenge(random, used)));
    expect(used.size).toBe(15);
  });
  it('las letras del reto son distintas', () => {
    const random = seeded(11);
    for (let i = 0; i < 100; i += 1) {
      const challenge = pickChallenge(random);
      if (challenge.kind === 'letras') expect(challenge.letters[0]).not.toBe(challenge.letters[1]);
    }
  });
});

describe('lectura del payload y las respuestas', () => {
  it('lee el reto y descarta lo que no tiene forma', () => {
    expect(readPlateChallenge({ challenge: { kind: 'letras', letters: ['K', 'M'] } })).toEqual({ kind: 'letras', letters: ['K', 'M'] });
    expect(readPlateChallenge({ challenge: { kind: 'repite', digit: '7' } })).toEqual({ kind: 'repite', digit: '7' });
    expect(readPlateChallenge({ challenge: { kind: 'letras', letters: ['A', 'M'] } })).toBeNull();
    expect(readPlateChallenge({ challenge: { kind: 'otro' } })).toBeNull();
    expect(readPlateChallenge(null)).toBeNull();
  });
  it('puntos por orden de llegada', () => {
    expect([1, 2, 3, 4, 5, 9].map(pointsForPosition)).toEqual([100, 75, 50, 25, 10, 10]);
  });
  it('lee la respuesta de submit_plate', () => {
    expect(readPlateAnswer({ plate: '1234KMB', position: 1 })).toEqual({ plate: '1234KMB', position: 1 });
    expect(readPlateAnswer({ option: 'x' })).toBeNull();
  });
});
