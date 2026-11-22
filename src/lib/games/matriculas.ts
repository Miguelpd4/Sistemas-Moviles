/**
 * «Cazamatrículas» (#48): un reto sobre las matrículas españolas actuales (1234 BCD) y el primero
 * que ve un coche que lo cumple escribe su matrícula. Las mismas reglas están en SQL
 * (`plate_matches` y `submit_plate`, migración juegos_camino): si cambian aquí, cambian allí.
 */

/** Tiempo de cada ronda: hay que ver pasar coches. */
export const PLATE_SECONDS = 180;
/** Las matrículas actuales solo usan estas consonantes (sin vocales, Ñ ni Q). */
export const PLATE_LETTERS = 'BCDFGHJKLMNPRSTVWXYZ';
/** Primeras letras que se ven hoy en la carretera (de 2000 a ahora). */
const FIRST_LETTERS = 'BCDFGHJKLM';
/** Puntos por orden de llegada; del quinto en adelante, 10. */
export const PLATE_POINTS = [100, 75, 50, 25] as const;

export type PlateChallenge =
  | { kind: 'letras'; letters: [string, string] }
  | { kind: 'suma'; total: number }
  | { kind: 'empieza'; letter: string }
  | { kind: 'repite'; digit: string };

const PLATE_RE = /^[0-9]{4}[BCDFGHJKLMNPRSTVWXYZ]{3}$/;

/** «1234 bcd», «1234-BCD»… → «1234BCD», o null si no es una matrícula actual. */
export function normalizePlate(input: string): string | null {
  const plate = input.replace(/[^0-9A-Za-z]/g, '').toUpperCase();
  return PLATE_RE.test(plate) ? plate : null;
}

/** «1234BCD» → «1234 BCD». */
export function formatPlate(plate: string): string {
  return plate.length === 7 ? `${plate.slice(0, 4)} ${plate.slice(4)}` : plate;
}

export function plateMatches(challenge: PlateChallenge, plate: string): boolean {
  if (!PLATE_RE.test(plate)) return false;
  const digits = plate.slice(0, 4);
  const letters = plate.slice(4);
  switch (challenge.kind) {
    case 'letras':
      return letters.includes(challenge.letters[0]) && letters.includes(challenge.letters[1]);
    case 'suma':
      return [...digits].reduce((sum, d) => sum + Number(d), 0) === challenge.total;
    case 'empieza':
      return letters.startsWith(challenge.letter) && Number(digits[3]) % 2 === 0;
    case 'repite':
      return digits.split(challenge.digit).length - 1 >= 2;
  }
}

/** El reto en palabras, para la pantalla. */
export function describeChallenge(challenge: PlateChallenge): string {
  switch (challenge.kind) {
    case 'letras':
      return `Una matrícula con las letras ${challenge.letters[0]} y ${challenge.letters[1]}`;
    case 'suma':
      return `Una matrícula cuyos números sumen ${challenge.total}`;
    case 'empieza':
      return `Una matrícula que empiece por ${challenge.letter} y con el número acabado en par`;
    case 'repite':
      return `Una matrícula con dos ${challenge.digit} (o más) en el número`;
  }
}

/** Un ejemplo que cumple el reto, para que se entienda. */
export function challengeExample(challenge: PlateChallenge): string {
  switch (challenge.kind) {
    case 'letras': {
      const filler = [...PLATE_LETTERS].find((letter) => !challenge.letters.includes(letter)) ?? 'B';
      return `4071 ${challenge.letters[0]}${filler}${challenge.letters[1]}`;
    }
    case 'suma': {
      const total = challenge.total;
      const a = Math.min(9, total);
      const b = Math.min(9, total - a);
      const c = Math.min(9, total - a - b);
      return `${a}${b}${c}${total - a - b - c} BCD`;
    }
    case 'empieza':
      return `3518 ${challenge.letter}BC`;
    case 'repite':
      return `${challenge.digit}2${challenge.digit}5 BCD`;
  }
}

export function challengeKey(challenge: PlateChallenge): string {
  switch (challenge.kind) {
    case 'letras':
      return `letras:${[...challenge.letters].sort().join('')}`;
    case 'suma':
      return `suma:${challenge.total}`;
    case 'empieza':
      return `empieza:${challenge.letter}`;
    case 'repite':
      return `repite:${challenge.digit}`;
  }
}

const pick = <T>(list: readonly T[], random: () => number): T => list[Math.floor(random() * list.length) % list.length] as T;

/** Un reto nuevo (sin repetir los de este viaje si se puede). */
export function pickChallenge(random: () => number, used: Iterable<string> = []): PlateChallenge {
  const seen = new Set(used);
  let challenge = makeChallenge(random);
  for (let i = 0; i < 20 && seen.has(challengeKey(challenge)); i += 1) challenge = makeChallenge(random);
  return challenge;
}

function makeChallenge(random: () => number): PlateChallenge {
  const kind = pick(['letras', 'suma', 'empieza', 'repite'] as const, random);
  if (kind === 'letras') {
    const first = pick([...PLATE_LETTERS], random);
    const rest = [...PLATE_LETTERS].filter((letter) => letter !== first);
    return { kind, letters: [first, pick(rest, random)] };
  }
  if (kind === 'suma') return { kind, total: 14 + Math.floor(random() * 9) };
  if (kind === 'empieza') return { kind, letter: pick([...FIRST_LETTERS], random) };
  return { kind, digit: String(Math.floor(random() * 10) % 10) };
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

/** El reto guardado en el payload de la ronda (`{ challenge }`), sin fiarse de su forma. */
export function readPlateChallenge(payload: unknown): PlateChallenge | null {
  const challenge = isRecord(payload) ? payload.challenge : null;
  if (!isRecord(challenge)) return null;
  const letter = (value: unknown) => typeof value === 'string' && value.length === 1 && PLATE_LETTERS.includes(value);
  switch (challenge.kind) {
    case 'letras': {
      const letters = challenge.letters;
      return Array.isArray(letters) && letter(letters[0]) && letter(letters[1])
        ? { kind: 'letras', letters: [String(letters[0]), String(letters[1])] }
        : null;
    }
    case 'suma':
      return typeof challenge.total === 'number' ? { kind: 'suma', total: challenge.total } : null;
    case 'empieza':
      return letter(challenge.letter) ? { kind: 'empieza', letter: String(challenge.letter) } : null;
    case 'repite':
      return typeof challenge.digit === 'string' && /^[0-9]$/.test(challenge.digit) ? { kind: 'repite', digit: challenge.digit } : null;
    default:
      return null;
  }
}

export function pointsForPosition(position: number): number {
  return PLATE_POINTS[position - 1] ?? 10;
}

/** La respuesta guardada por submit_plate (`{ plate, position }`). */
export function readPlateAnswer(answer: unknown): { plate: string; position: number } | null {
  if (!isRecord(answer) || typeof answer.plate !== 'string') return null;
  return { plate: answer.plate, position: typeof answer.position === 'number' ? answer.position : 0 };
}
