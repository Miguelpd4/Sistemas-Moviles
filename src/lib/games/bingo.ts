import type MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import type { ComponentProps } from 'react';

/**
 * «Bingo de carretera» (#48): cada pasajero tiene un cartón de 3×3 con cosas que se ven desde el
 * coche y las marca al verlas. La primera línea de cada uno puntúa según el orden (30/20/10) y el
 * primer cartón completo se lleva 100 más y termina la ronda. Las mismas reglas están en SQL
 * (`bingo_mark`, migración bingo): si cambian aquí, cambian allí.
 */

/** Hay tiempo de sobra: termina antes si alguien canta bingo. */
export const BINGO_SECONDS = 15 * 60;
export const BINGO_SIZE = 9;

export type BingoItem = { id: string; label: string; icon: ComponentProps<typeof MaterialCommunityIcons>['name'] };

/** Casillas posibles. Los id no se cambian: se guardan en las rondas. */
export const BINGO_ITEMS: readonly BingoItem[] = [
  { id: 'vaca', label: 'Vaca', icon: 'cow' },
  { id: 'caballo', label: 'Caballo', icon: 'horse' },
  { id: 'oveja', label: 'Ovejas', icon: 'sheep' },
  { id: 'perro', label: 'Perro', icon: 'dog' },
  { id: 'tractor', label: 'Tractor', icon: 'tractor' },
  { id: 'camion', label: 'Camión', icon: 'truck' },
  { id: 'autobus', label: 'Autobús', icon: 'bus' },
  { id: 'caravana', label: 'Caravana', icon: 'caravan' },
  { id: 'moto', label: 'Moto', icon: 'motorbike' },
  { id: 'ciclista', label: 'Ciclista', icon: 'bike' },
  { id: 'policia', label: 'Policía', icon: 'police-badge' },
  { id: 'ambulancia', label: 'Ambulancia', icon: 'ambulance' },
  { id: 'grua', label: 'Grúa', icon: 'tow-truck' },
  { id: 'bomberos', label: 'Bomberos', icon: 'fire-truck' },
  { id: 'descapotable', label: 'Descapotable', icon: 'car-convertible' },
  { id: 'taxi', label: 'Taxi', icon: 'taxi' },
  { id: 'furgoneta', label: 'Furgoneta', icon: 'van-utility' },
  { id: 'gasolinera', label: 'Gasolinera', icon: 'gas-station' },
  { id: 'molino', label: 'Molino de viento', icon: 'wind-turbine' },
  { id: 'puente', label: 'Puente', icon: 'bridge' },
  { id: 'tunel', label: 'Túnel', icon: 'tunnel' },
  { id: 'stop', label: 'Señal de STOP', icon: 'octagon' },
  { id: 'radar', label: 'Radar', icon: 'cctv' },
  { id: 'peaje', label: 'Peaje', icon: 'boom-gate' },
  { id: 'obras', label: 'Obras', icon: 'traffic-cone' },
  { id: 'semaforo', label: 'Semáforo', icon: 'traffic-light' },
  { id: 'iglesia', label: 'Iglesia', icon: 'church' },
  { id: 'castillo', label: 'Castillo', icon: 'castle' },
  { id: 'avion', label: 'Avión', icon: 'airplane' },
  { id: 'tren', label: 'Tren', icon: 'train' },
  { id: 'rio', label: 'Río', icon: 'waves' },
  { id: 'granja', label: 'Granja o silo', icon: 'home-silo' },
  { id: 'toro', label: 'Toro de Osborne', icon: 'billboard' },
];

const BY_ID = new Map(BINGO_ITEMS.map((item) => [item.id, item]));

export function bingoItem(id: string): BingoItem {
  return BY_ID.get(id) ?? { id, label: id, icon: 'help-circle-outline' };
}

/** Las 8 líneas del cartón: 3 filas, 3 columnas y 2 diagonales (posiciones 0–8). */
export const BINGO_LINES: readonly (readonly [number, number, number])[] = [
  [0, 1, 2],
  [3, 4, 5],
  [6, 7, 8],
  [0, 3, 6],
  [1, 4, 7],
  [2, 5, 8],
  [0, 4, 8],
  [2, 4, 6],
];

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

/** Un cartón distinto para cada jugador: 9 casillas sin repetir. */
export function makeCards(userIds: readonly string[], random: () => number): Record<string, string[]> {
  const ids = BINGO_ITEMS.map((item) => item.id);
  return Object.fromEntries(userIds.map((userId) => [userId, shuffle(ids, random).slice(0, BINGO_SIZE)]));
}

/** Posiciones de las líneas completas del cartón. */
export function completedLines(card: readonly string[], marked: ReadonlySet<string>): (readonly [number, number, number])[] {
  return BINGO_LINES.filter((line) => line.every((position) => marked.has(card[position] ?? '')));
}

export function isFull(card: readonly string[], marked: ReadonlySet<string>): boolean {
  return card.length === BINGO_SIZE && card.every((item) => marked.has(item));
}

/** Puntos de la primera línea según el orden en que se canta. */
export function linePoints(rank: number): number {
  return rank === 1 ? 30 : rank === 2 ? 20 : 10;
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

/** Los cartones del payload (`{ cards: { user_id: [9 casillas] } }`), sin fiarse de su forma. */
export function readBingoCards(payload: unknown): Record<string, string[]> {
  const cards = isRecord(payload) ? payload.cards : null;
  if (!isRecord(cards)) return {};
  return Object.fromEntries(
    Object.entries(cards).flatMap(([userId, card]): [string, string[]][] =>
      Array.isArray(card) && card.length === BINGO_SIZE && card.every((item) => typeof item === 'string')
        ? [[userId, card as string[]]]
        : [],
    ),
  );
}

export type BingoAnswer = { marked: string[]; line: number | null; bingo: boolean };

/** Lo que guarda bingo_mark en game_answers (`{ marked, line?, bingo? }`). */
export function readBingoAnswer(answer: unknown): BingoAnswer {
  if (!isRecord(answer)) return { marked: [], line: null, bingo: false };
  return {
    marked: Array.isArray(answer.marked) ? answer.marked.filter((item): item is string => typeof item === 'string') : [],
    line: typeof answer.line === 'number' ? answer.line : null,
    bingo: answer.bingo === true,
  };
}

/** Lo que devuelve bingo_mark. */
export function readBingoResult(value: unknown): { line: number | null; bingo: boolean; points: number } {
  if (!isRecord(value)) return { line: null, bingo: false, points: 0 };
  return {
    line: typeof value.line === 'number' ? value.line : null,
    bingo: value.bingo === true,
    points: typeof value.points === 'number' ? value.points : 0,
  };
}
