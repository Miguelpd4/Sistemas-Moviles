import { decideInvite, invitePath, inviteTab, roundFinished, type RoundChange } from '../gameInvites';

const insert = (over: Partial<RoundChange['new']> = {}): RoundChange => ({
  eventType: 'INSERT',
  new: { id: 'r1', game: 'trivial', status: 'activa', created_by: 'carlos', ...over },
});

const ctx = { myId: 'ana', seen: new Set<string>(), viewing: 'musica' };

describe('decideInvite', () => {
  it('avisa a los demás cuando alguien empieza una partida', () => {
    expect(decideInvite(insert(), ctx)).toEqual({
      invite: { roundId: 'r1', game: 'trivial', creatorId: 'carlos', tab: 'juegos' },
      markSeen: 'r1',
    });
  });

  it('quien la empieza no recibe su propio aviso', () => {
    expect(decideInvite(insert({ created_by: 'ana' }), ctx)).toEqual({ invite: null, markSeen: 'r1' });
  });

  it('no repite el aviso de una ronda ya tratada', () => {
    expect(decideInvite(insert(), { ...ctx, seen: new Set(['r1']) })).toEqual({ invite: null, markSeen: null });
  });

  it('las actualizaciones de la ronda (votos, revelar) no avisan', () => {
    expect(decideInvite({ ...insert(), eventType: 'UPDATE' }, ctx).invite).toBeNull();
  });

  it('si ya estoy en la pestaña del juego, no hay aviso redundante', () => {
    expect(decideInvite(insert(), { ...ctx, viewing: 'juegos' })).toEqual({ invite: null, markSeen: 'r1' });
  });

  it('los turnos de DJ llevan a Música', () => {
    expect(decideInvite(insert({ game: 'dj' }), { ...ctx, viewing: 'juegos' }).invite?.tab).toBe('musica');
    expect(decideInvite(insert({ game: 'dj' }), ctx).invite).toBeNull();
  });

  it('una ronda que no está activa no avisa', () => {
    expect(decideInvite(insert({ status: 'cerrada' }), ctx).invite).toBeNull();
  });
});

describe('navegación y fin de la ronda', () => {
  it('lleva a la pestaña donde se juega', () => {
    expect(inviteTab('bingo')).toBe('juegos');
    expect(invitePath('s1', 'juegos')).toBe('/sala/s1/juegos');
    expect(invitePath('s1', inviteTab('dj'))).toBe('/sala/s1/musica');
  });

  it('detecta cuándo termina la ronda del aviso', () => {
    expect(roundFinished({ eventType: 'UPDATE', new: { id: 'r1', status: 'revelada' } }, 'r1')).toBe(true);
    expect(roundFinished({ eventType: 'UPDATE', new: { id: 'r1', status: 'activa' } }, 'r1')).toBe(false);
    expect(roundFinished({ eventType: 'UPDATE', new: { id: 'r2', status: 'cerrada' } }, 'r1')).toBe(false);
    expect(roundFinished({ eventType: 'DELETE', new: {}, old: { id: 'r1' } }, 'r1')).toBe(true);
  });
});
