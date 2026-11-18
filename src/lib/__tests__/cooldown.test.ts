import { canTrigger, secondsLeft } from '../cooldown';

describe('canTrigger', () => {
  it('sin uso anterior se puede', () => {
    expect(canTrigger(null, 1000, 60_000)).toBe(true);
  });
  it('dentro del tiempo de espera no se puede', () => {
    expect(canTrigger(0, 59_999, 60_000)).toBe(false);
  });
  it('justo al cumplirse se puede', () => {
    expect(canTrigger(0, 60_000, 60_000)).toBe(true);
  });
  it('cuenta los segundos que faltan', () => {
    expect(secondsLeft(0, 30_500, 60_000)).toBe(30);
    expect(secondsLeft(null, 0, 60_000)).toBe(0);
  });
});
