import {
  BINGO_ITEMS,
  BINGO_SIZE,
  bingoItem,
  completedLines,
  isFull,
  linePoints,
  makeCards,
  readBingoAnswer,
  readBingoCards,
  readBingoResult,
} from '../bingo';

function seeded(seed: number) {
  let s = seed;
  return () => {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

const card = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i'];

describe('makeCards', () => {
  it('un cartón de 9 casillas distintas para cada jugador', () => {
    const cards = makeCards(['u1', 'u2', 'u3'], seeded(4));
    expect(Object.keys(cards)).toEqual(['u1', 'u2', 'u3']);
    for (const items of Object.values(cards)) {
      expect(items).toHaveLength(BINGO_SIZE);
      expect(new Set(items).size).toBe(BINGO_SIZE);
      expect(items.every((id) => BINGO_ITEMS.some((item) => item.id === id))).toBe(true);
    }
    expect(cards.u1).not.toEqual(cards.u2);
  });
  it('el catálogo no repite id', () => {
    expect(new Set(BINGO_ITEMS.map((item) => item.id)).size).toBe(BINGO_ITEMS.length);
  });
});

describe('líneas y cartón completo (igual que bingo_mark en SQL)', () => {
  it('cuenta filas, columnas y diagonales', () => {
    expect(completedLines(card, new Set(['a', 'e']))).toHaveLength(0);
    expect(completedLines(card, new Set(['a', 'e', 'i']))).toEqual([[0, 4, 8]]);
    expect(completedLines(card, new Set(['a', 'b', 'c', 'd', 'g']))).toEqual([
      [0, 1, 2],
      [0, 3, 6],
    ]);
  });
  it('bingo solo con las 9', () => {
    expect(isFull(card, new Set(card.slice(0, 8)))).toBe(false);
    expect(isFull(card, new Set(card))).toBe(true);
  });
  it('puntos de la línea según el orden', () => {
    expect([1, 2, 3, 7].map(linePoints)).toEqual([30, 20, 10, 10]);
  });
});

describe('lectura', () => {
  it('lee los cartones y descarta los mal formados', () => {
    expect(readBingoCards({ cards: { u1: card, u2: ['a'], u3: 'x' } })).toEqual({ u1: card });
    expect(readBingoCards(null)).toEqual({});
  });
  it('lee la respuesta y el resultado de bingo_mark', () => {
    expect(readBingoAnswer({ marked: ['a', 1, 'b'], line: 2 })).toEqual({ marked: ['a', 'b'], line: 2, bingo: false });
    expect(readBingoAnswer(null)).toEqual({ marked: [], line: null, bingo: false });
    expect(readBingoResult({ lines: 1, line: 1, bingo: false, points: 30 })).toEqual({ line: 1, bingo: false, points: 30 });
  });
  it('una casilla desconocida no rompe la pantalla', () => {
    expect(bingoItem('vaca').label).toBe('Vaca');
    expect(bingoItem('nada').label).toBe('nada');
  });
});
