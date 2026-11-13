import { initialJoinState, joinReducer, type JoinAction, type JoinState } from '../joinFlow';
import type { SessionPreview } from '../../types/session';

const preview = (overrides: Partial<SessionPreview> = {}): SessionPreview => ({
  session_id: 's1',
  status: 'abierta',
  join_mode: 'libre',
  car_name: 'Ibiza',
  seats: 5,
  driver_name: 'Ana',
  taken_seats: [1],
  my_status: null,
  ...overrides,
});

const run = (actions: JoinAction[], from: JoinState = initialJoinState) => actions.reduce(joinReducer, from);
const loaded = (p: SessionPreview = preview()): JoinAction => ({
  type: 'preview_loaded',
  preview: p,
  defaultName: 'Bea',
  avatarKind: 'preset',
  avatarValue: 'avatar-03',
});

describe('joinReducer', () => {
  it('recorre el camino feliz hasta entrar', () => {
    const state = run([
      loaded(),
      { type: 'start' },
      { type: 'profile_done' },
      { type: 'set_seat', seat: 3 },
      { type: 'submit' },
      { type: 'join_result', status: 'dentro' },
    ]);
    expect(state.step).toBe('dentro');
    expect(state.name).toBe('Bea');
    expect(state.seat).toBe(3);
  });

  it('va directamente a la sala o a la espera según my_status', () => {
    expect(run([loaded(preview({ my_status: 'dentro' }))]).step).toBe('dentro');
    expect(run([loaded(preview({ my_status: 'pendiente' }))]).step).toBe('pendiente');
    expect(run([loaded(preview({ my_status: 'rechazado' }))]).step).toBe('rechazado');
    expect(run([loaded(preview({ my_status: 'fuera' }))]).step).toBe('bienvenida');
  });

  it('no deja pasar del perfil sin nombre', () => {
    const state = run([loaded(), { type: 'start' }, { type: 'set_name', name: '   ' }, { type: 'profile_done' }]);
    expect(state.step).toBe('perfil');
    expect(state.notice).not.toBeNull();
  });

  it('corta el nombre a 30 caracteres', () => {
    expect(run([{ type: 'set_name', name: 'x'.repeat(40) }]).name).toHaveLength(30);
  });

  it('si el asiento está cogido vuelve al paso de asiento con aviso', () => {
    const state = run([
      loaded(),
      { type: 'start' },
      { type: 'profile_done' },
      { type: 'set_seat', seat: 3 },
      { type: 'submit' },
      { type: 'seat_taken', preview: preview({ taken_seats: [1, 3] }), message: 'cogido' },
    ]);
    expect(state.step).toBe('asiento');
    expect(state.seat).toBeNull();
    expect(state.notice).toBe('cogido');
    expect(state.preview?.taken_seats).toEqual([1, 3]);
  });

  it('la espera pasa a la sala o a rechazado cuando cambia el estado', () => {
    const waiting = run([loaded(preview({ my_status: 'pendiente' }))]);
    expect(joinReducer(waiting, { type: 'status_changed', status: 'dentro' }).step).toBe('dentro');
    expect(joinReducer(waiting, { type: 'status_changed', status: 'rechazado' }).step).toBe('rechazado');
  });

  it('un error de carga se puede reintentar', () => {
    const failed = run([{ type: 'load_failed', message: 'sin viaje' }]);
    expect(failed.step).toBe('error');
    expect(joinReducer(failed, { type: 'retry' }).step).toBe('cargando');
  });

  it('show_notice muestra un aviso sin cambiar de paso', () => {
    const state = run([loaded(), { type: 'start' }, { type: 'show_notice', message: 'sin foto' }]);
    expect(state.step).toBe('perfil');
    expect(state.notice).toBe('sin foto');
  });

  it('atrás vuelve un paso', () => {
    const atSeat = run([loaded(), { type: 'start' }, { type: 'profile_done' }]);
    expect(joinReducer(atSeat, { type: 'back' }).step).toBe('perfil');
  });
});
