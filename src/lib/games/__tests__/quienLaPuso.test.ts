import { expectedAnswers, guessWhoBlocker, readGuessWhoPayload, readSolutionOption } from '../quienLaPuso';

describe('readGuessWhoPayload', () => {
  it('lee el payload de start_guess_who', () => {
    const payload = readGuessWhoPayload({
      queueId: 'q1',
      title: 'Canción',
      artist: 'Artista',
      albumArtUrl: 'https://i.scdn.co/a.jpg',
      options: [
        { id: 'u1', label: 'Ana', avatarKind: 'preset', avatarValue: 'avatar-01' },
        { id: 'u2', label: 'Bea' },
      ],
    });
    expect(payload).toEqual({
      queueId: 'q1',
      title: 'Canción',
      artist: 'Artista',
      albumArtUrl: 'https://i.scdn.co/a.jpg',
      options: [
        { id: 'u1', label: 'Ana', avatarKind: 'preset', avatarValue: 'avatar-01' },
        { id: 'u2', label: 'Bea', avatarKind: undefined, avatarValue: undefined },
      ],
    });
  });
  it('descarta opciones mal formadas y aguanta un payload vacío', () => {
    expect(readGuessWhoPayload({ options: [{ id: 'u1' }, 'x', null, { id: 'u2', label: 'Bea' }] }).options).toEqual([
      { id: 'u2', label: 'Bea', avatarKind: undefined, avatarValue: undefined },
    ]);
    expect(readGuessWhoPayload(null)).toEqual({ queueId: null, title: '', artist: '', albumArtUrl: null, options: [] });
    expect(readGuessWhoPayload([1, 2]).options).toEqual([]);
  });
});

describe('readSolutionOption', () => {
  it('saca la persona de la solución', () => {
    expect(readSolutionOption({ option: 'u2' })).toBe('u2');
  });
  it('null si aún no se ve o no tiene forma', () => {
    expect(readSolutionOption(null)).toBeNull();
    expect(readSolutionOption({ option: 3 })).toBeNull();
    expect(readSolutionOption('u2')).toBeNull();
  });
});

describe('guessWhoBlocker', () => {
  it('se puede con canción sonando, 3 personas y canción nueva', () => {
    expect(guessWhoBlocker({ nowPlayingId: 'q1', players: 3, usedQueueIds: ['q0'] })).toBeNull();
  });
  it('sin canción sonando', () => {
    expect(guessWhoBlocker({ nowPlayingId: null, players: 4, usedQueueIds: [] })).toBe('nothing_playing');
  });
  it('con menos de 3 personas (antes que lo demás)', () => {
    expect(guessWhoBlocker({ nowPlayingId: null, players: 2, usedQueueIds: [] })).toBe('not_enough_players');
  });
  it('con una canción ya jugada', () => {
    expect(guessWhoBlocker({ nowPlayingId: 'q1', players: 3, usedQueueIds: new Set(['q1']) })).toBe('song_already_used');
  });
});

describe('expectedAnswers', () => {
  it('todos menos quien la puso', () => {
    expect(expectedAnswers(['a', 'b', 'c', 'd'], 'b')).toBe(3);
  });
  it('si quien la puso ya no está, todos', () => {
    expect(expectedAnswers(['a', 'b', 'c'], 'z')).toBe(3);
    expect(expectedAnswers(['a', 'b', 'c'], null)).toBe(3);
  });
});
