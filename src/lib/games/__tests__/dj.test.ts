import { djState, readDjPayload, turnStatus, voteOptions, type DjSong } from '../dj';

const payload = readDjPayload({
  turns: [
    { id: 'bea', label: 'Bea' },
    { id: 'carlos', label: 'Carlos' },
    { id: 'dani', label: 'Dani' },
  ],
  skipped: [],
});
const inside = new Set(['bea', 'carlos', 'dani']);
const song = (id: string, addedBy: string, status = 'en_cola'): DjSong => ({ id, added_by: addedBy, status, title: `T-${id}`, artist: 'A' });

describe('readDjPayload', () => {
  it('lee turnos y saltados, y aguanta basura', () => {
    expect(readDjPayload({ turns: [{ id: 'a', label: 'Ana' }, { id: 'b' }, 3], skipped: ['x', 2] })).toEqual({
      turns: [{ id: 'a', label: 'Ana', avatarKind: undefined, avatarValue: undefined }],
      skipped: ['x'],
    });
    expect(readDjPayload(null)).toEqual({ turns: [], skipped: [] });
  });
});

describe('djState', () => {
  it('al empezar le toca al primero', () => {
    const state = djState({ payload, insideIds: inside, songs: [] });
    expect(state.phase).toBe('eligiendo');
    expect(state.currentTurn?.id).toBe('bea');
  });
  it('quien ya eligió pasa el turno al siguiente', () => {
    expect(djState({ payload, insideIds: inside, songs: [song('1', 'bea')] }).currentTurn?.id).toBe('carlos');
  });
  it('se salta a quien se saltó el turno y a quien ya no está', () => {
    const skipped = { ...payload, skipped: ['carlos'] };
    expect(djState({ payload: skipped, insideIds: inside, songs: [song('1', 'bea')] }).currentTurn?.id).toBe('dani');
    expect(djState({ payload, insideIds: new Set(['bea', 'dani']), songs: [song('1', 'bea')] }).currentTurn?.id).toBe('dani');
  });
  it('con todos elegidos y canciones por sonar: escuchando', () => {
    const state = djState({ payload, insideIds: inside, songs: [song('1', 'bea', 'reproducida'), song('2', 'carlos', 'sonando'), song('3', 'dani')] });
    expect(state).toEqual({ phase: 'escuchando', currentTurn: null, played: 1, total: 3 });
  });
  it('con todas sonadas (o saltadas): votando', () => {
    const songs = [song('1', 'bea', 'reproducida'), song('2', 'carlos', 'saltada'), song('3', 'dani', 'reproducida')];
    expect(djState({ payload, insideIds: inside, songs }).phase).toBe('votando');
  });
  it('si todos se saltaron: vacia', () => {
    const allSkipped = { ...payload, skipped: ['bea', 'carlos', 'dani'] };
    expect(djState({ payload: allSkipped, insideIds: inside, songs: [] }).phase).toBe('vacia');
  });
});

describe('turnStatus', () => {
  it('cada turno con su estado', () => {
    const p = { ...payload, skipped: ['carlos'] };
    const insideIds = new Set(['bea', 'carlos']);
    const songs = [song('1', 'bea')];
    const state = djState({ payload: { ...p, turns: [...p.turns, { id: 'eva', label: 'Eva' }] }, insideIds: new Set([...insideIds, 'eva']), songs });
    expect(turnStatus(p.turns[0]!, state, p, insideIds, songs)).toBe('eligio');
    expect(turnStatus(p.turns[1]!, state, p, insideIds, songs)).toBe('saltado');
    expect(turnStatus(p.turns[2]!, state, p, insideIds, songs)).toBe('fuera');
    expect(turnStatus({ id: 'eva', label: 'Eva' }, state, p, insideIds, songs)).toBe('le_toca');
  });
});

describe('voteOptions', () => {
  it('todas menos la mía', () => {
    const songs = [song('1', 'bea'), song('2', 'carlos')];
    expect(voteOptions(songs, 'bea')).toEqual([{ id: '2', label: 'T-2', detail: 'A' }]);
    expect(voteOptions(songs, null)).toHaveLength(2);
  });
});
