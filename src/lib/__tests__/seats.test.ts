import { AVATARS, getPresetAvatar, randomAvatarId } from '../avatars';
import { freeSeats, seatLabel, seatLayout } from '../seats';

describe('seatLayout', () => {
  it('reparte los asientos en filas', () => {
    expect(seatLayout(2)).toEqual([[1, 2]]);
    expect(seatLayout(4)).toEqual([[1, 2], [3, 4]]);
    expect(seatLayout(5)).toEqual([[1, 2], [3, 4, 5]]);
    expect(seatLayout(7)).toEqual([[1, 2], [3, 4, 5], [6, 7]]);
    expect(seatLayout(9)).toEqual([[1, 2], [3, 4, 5], [6, 7, 8], [9]]);
  });

  it('nombra los asientos', () => {
    expect(seatLabel(1)).toBe('Conductor');
    expect(seatLabel(2)).toBe('Copiloto');
    expect(seatLabel(4)).toBe('Asiento 4');
  });

  it('los asientos libres no incluyen el del conductor ni los ocupados', () => {
    expect(freeSeats(5, [1, 3])).toEqual([2, 4, 5]);
    expect(freeSeats(2, [1, 2])).toEqual([]);
  });
});

describe('avatars', () => {
  it('hay 12 personajes con ids únicos', () => {
    expect(AVATARS).toHaveLength(12);
    expect(new Set(AVATARS.map((a) => a.id)).size).toBe(12);
  });

  it('un id desconocido da el primer personaje', () => {
    expect(getPresetAvatar('no-existe').id).toBe('avatar-01');
    expect(getPresetAvatar('avatar-07').id).toBe('avatar-07');
  });

  it('randomAvatarId devuelve siempre un id válido', () => {
    expect(randomAvatarId(() => 0)).toBe('avatar-01');
    expect(randomAvatarId(() => 0.9999)).toBe('avatar-12');
  });
});
