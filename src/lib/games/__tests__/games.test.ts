import { PROBABLE_QUESTIONS, pickQuestion } from '../probable';
import { tally } from '../tally';

describe('pickQuestion', () => {
  it('el banco tiene 60 preguntas con id único', () => {
    expect(PROBABLE_QUESTIONS).toHaveLength(60);
    expect(new Set(PROBABLE_QUESTIONS.map((q) => q.id)).size).toBe(60);
  });
  it('no repite con 59 usadas', () => {
    const used = PROBABLE_QUESTIONS.slice(0, 59).map((q) => q.id);
    expect(pickQuestion(used, () => 0.99)?.id).toBe(PROBABLE_QUESTIONS[59]?.id);
  });
  it('devuelve null con las 60 usadas', () => {
    expect(pickQuestion(PROBABLE_QUESTIONS.map((q) => q.id))).toBeNull();
  });
});

describe('tally', () => {
  const options = [
    { id: 'a', label: 'Ana' },
    { id: 'b', label: 'Bea' },
    { id: 'c', label: 'Carlos' },
  ];
  it('con un ganador', () => {
    const result = tally(
      [
        { userId: '1', option: 'b' },
        { userId: '2', option: 'b' },
        { userId: '3', option: 'a' },
      ],
      options,
    );
    expect(result.winners).toEqual(['b']);
    expect(result.rows[0]).toMatchObject({ id: 'b', votes: 2 });
    expect(result.total).toBe(3);
  });
  it('con empate', () => {
    const result = tally(
      [
        { userId: '1', option: 'a' },
        { userId: '2', option: 'c' },
      ],
      options,
    );
    expect(result.winners).toEqual(['a', 'c']);
  });
  it('sin votos', () => {
    const result = tally([], options);
    expect(result.winners).toEqual([]);
    expect(result.total).toBe(0);
  });
});
