import { haversineM } from '../distance';

/**
 * «Trivial del camino» (#48): preguntas sobre los sitios de Wikipedia que hay cerca del coche
 * (GeoSearch, hasta 10 km). Dos tipos de pregunta:
 *  - «¿Qué sitio es?»: el principio del artículo con el nombre tapado y cuatro sitios cercanos.
 *  - «¿Cuál está más cerca?»: cuatro sitios cercanos y gana el que está a menos distancia.
 * Quien empieza la ronda prepara la pregunta en su móvil; la respuesta va a game_round_secrets y
 * reveal_round da 100 puntos a quien acierta.
 */

export const TRIVIAL_SECONDS = 30;
export const TRIVIAL_RADIUS_M = 10_000;
const OPTIONS = 4;
/** En «¿Cuál está más cerca?» las distancias tienen que distinguirse. */
const MIN_GAP_M = 300;
const CLUE_MAX = 260;

export type WikiPlace = { id: string; title: string; extract: string; lat: number; lon: number; distanceM: number };
export type TrivialKind = 'cual_es' | 'mas_cerca';
export type TrivialOption = { id: string; label: string };
export type TrivialPayload = { kind: TrivialKind; question: string; clue: string | null; options: TrivialOption[] };
export type TrivialSolution = { option: string; title: string; extract: string; distanceM: number };

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

/** Artículos que no son sitios (listas, desambiguaciones…). */
const NOT_A_PLACE = /^(Anexo|Categoría|Wikipedia|Plantilla|Portal):/;

/**
 * Respuesta de la API de Wikipedia (`generator=geosearch`, `prop=coordinates|extracts`,
 * `formatversion=2`) → sitios con su distancia a `here`, del más cercano al más lejano.
 */
export function parseGeoPlaces(json: unknown, here: { lat: number; lon: number }): WikiPlace[] {
  const query = isRecord(json) ? json.query : null;
  const pages = isRecord(query) && Array.isArray(query.pages) ? query.pages : [];
  return pages
    .flatMap((page: unknown): WikiPlace[] => {
      if (!isRecord(page) || typeof page.title !== 'string' || NOT_A_PLACE.test(page.title)) return [];
      const coords = Array.isArray(page.coordinates) ? page.coordinates[0] : null;
      if (!isRecord(coords) || typeof coords.lat !== 'number' || typeof coords.lon !== 'number') return [];
      const point = { lat: coords.lat, lon: coords.lon };
      return [
        {
          id: String(page.pageid ?? page.title),
          title: page.title,
          extract: typeof page.extract === 'string' ? page.extract.trim() : '',
          ...point,
          distanceM: Math.round(haversineM(here, point)),
        },
      ];
    })
    .sort((a, b) => a.distanceM - b.distanceM);
}

const LETTER = 'A-Za-zÀ-ÖØ-öø-ÿ0-9';
const GENERIC = new Set(
  'iglesia ermita parroquia castillo torre palacio puente museo plaza calle avenida estación estacion río rio sierra embalse parque catedral convento monasterio casa colegio instituto hospital aeropuerto estadio teatro puerta arco fuente mercado barrio jardín jardin santuario capilla basílica basilica real nuestra señora santa santo san de del la las los el y'.split(
    ' ',
  ),
);

const escape = (text: string) => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

function replaceWord(text: string, word: string): string {
  const re = new RegExp(`(^|[^${LETTER}])${escape(word)}(?=[^${LETTER}]|$)`, 'gi');
  return text.replace(re, '$1___');
}

/** El principio del artículo con el nombre del sitio (y sus palabras propias) tapado. */
export function redactClue(extract: string, title: string): string {
  const base = title.replace(/\s*\(.*\)\s*$/, '').trim();
  let clue = replaceWord(extract, base);
  for (const word of base.split(/[\s,-]+/)) {
    if (word.length >= 4 && !GENERIC.has(word.toLowerCase())) clue = replaceWord(clue, word);
  }
  clue = clue.replace(/\s*\([^)]*\)/g, '').replace(/\s+/g, ' ').trim();
  if (clue.length <= CLUE_MAX) return clue;
  const cut = clue.slice(0, CLUE_MAX);
  const end = cut.lastIndexOf('. ');
  return end > 80 ? cut.slice(0, end + 1) : `${cut.trimEnd()}…`;
}

/** ¿La pista sirve? Tiene que decir algo y no dejar ver el nombre. */
function usableClue(clue: string, title: string): boolean {
  const base = title.replace(/\s*\(.*\)\s*$/, '').toLowerCase();
  return clue.length >= 60 && clue.includes('___') && !clue.toLowerCase().includes(base);
}

function shuffle<T>(list: readonly T[], random: () => number): T[] {
  const out = [...list];
  for (let i = out.length - 1; i > 0; i -= 1) {
    const j = Math.floor(random() * (i + 1));
    const a = out[i] as T;
    out[i] = out[j] as T;
    out[j] = a;
  }
  return out;
}

const label = (title: string) => title.replace(/\s*\(.*\)\s*$/, '');

/**
 * Prepara una pregunta con los sitios cercanos, o null si no hay bastantes. `used` son los sitios
 * que ya han sido respuesta en este viaje: se evitan si se puede.
 */
export function buildTrivia(
  places: readonly WikiPlace[],
  random: () => number,
  used: Iterable<string> = [],
): Trivia | null {
  const seen = new Set(used);
  const unique = places.filter((place, i) => places.findIndex((other) => label(other.title) === label(place.title)) === i);
  if (unique.length < OPTIONS) return null;

  const withClue = unique
    .map((place) => ({ place, clue: redactClue(place.extract, place.title) }))
    .filter(({ place, clue }) => usableClue(clue, place.title));
  const fresh = withClue.filter(({ place }) => !seen.has(place.id));
  const candidates = fresh.length > 0 ? fresh : withClue;

  const chosen = random() < 0.7 ? candidates[Math.floor(random() * candidates.length)] : undefined;
  if (chosen) {
    const { place: answer, clue } = chosen;
    const others = shuffle(unique.filter((place) => place.id !== answer.id), random).slice(0, OPTIONS - 1);
    return {
      payload: {
        kind: 'cual_es',
        question: '¿Qué sitio de por aquí es?',
        clue,
        options: shuffle([answer, ...others], random).map((place) => ({ id: place.id, label: label(place.title) })),
      },
      solution: { option: answer.id, title: answer.title, extract: answer.extract, distanceM: answer.distanceM },
    };
  }
  return buildNearest(unique, random, seen);
}

/** «¿Cuál está más cerca?»: cuatro sitios con distancias que se distinguen. */
type Trivia = { payload: TrivialPayload; solution: TrivialSolution };

function buildNearest(places: readonly WikiPlace[], random: () => number, seen: ReadonlySet<string>): Trivia | null {
  const picked: WikiPlace[] = [];
  for (const place of shuffle(places, random)) {
    if (picked.every((other) => Math.abs(other.distanceM - place.distanceM) >= MIN_GAP_M)) picked.push(place);
    if (picked.length === OPTIONS) break;
  }
  if (picked.length < OPTIONS) return null;
  const answer = picked.reduce((best, place) => (place.distanceM < best.distanceM ? place : best));
  if (seen.has(answer.id) && places.length > OPTIONS + 2) {
    // Si el más cercano ya salió, se prueba otra combinación una vez.
    const again = places.filter((place) => place.id !== answer.id);
    const retry = again.length >= OPTIONS ? buildNearest(again, random, new Set()) : null;
    if (retry) return retry;
  }
  return {
    payload: {
      kind: 'mas_cerca',
      question: '¿Cuál de estos sitios está más cerca del coche ahora mismo?',
      clue: null,
      options: picked.map((place) => ({ id: place.id, label: label(place.title) })),
    },
    solution: { option: answer.id, title: answer.title, extract: answer.extract, distanceM: answer.distanceM },
  };
}

/** El payload guardado en la ronda, sin fiarse de su forma. */
export function readTrivialPayload(payload: unknown): TrivialPayload | null {
  if (!isRecord(payload) || (payload.kind !== 'cual_es' && payload.kind !== 'mas_cerca') || !Array.isArray(payload.options)) return null;
  const options = payload.options.flatMap((item: unknown): TrivialOption[] =>
    isRecord(item) && typeof item.id === 'string' && typeof item.label === 'string' ? [{ id: item.id, label: item.label }] : [],
  );
  return {
    kind: payload.kind,
    question: typeof payload.question === 'string' ? payload.question : '¿…?',
    clue: typeof payload.clue === 'string' ? payload.clue : null,
    options,
  };
}

/** La solución, una vez revelada. */
export function readTrivialSolution(solution: unknown): TrivialSolution | null {
  if (!isRecord(solution) || typeof solution.option !== 'string') return null;
  return {
    option: solution.option,
    title: typeof solution.title === 'string' ? solution.title : '',
    extract: typeof solution.extract === 'string' ? solution.extract : '',
    distanceM: typeof solution.distanceM === 'number' ? solution.distanceM : 0,
  };
}
