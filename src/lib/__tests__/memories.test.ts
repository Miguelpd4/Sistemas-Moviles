import { expiryLabel, memoriesExpireAt, memoriesOpen } from '../memories';

const ended = '2026-11-20T12:00:00Z';
const at = (iso: string) => new Date(iso).getTime();

describe('memorias que caducan a los 7 días', () => {
  it('caducan 7 días después del final del viaje', () => {
    expect(memoriesExpireAt(ended)).toBe(at('2026-11-27T12:00:00Z'));
    expect(memoriesExpireAt(null)).toBeNull();
  });

  it('durante el viaje y los 7 días siguientes, el muro está abierto', () => {
    expect(memoriesOpen(null, at('2026-12-31T00:00:00Z'))).toBe(true);
    expect(memoriesOpen(ended, at('2026-11-27T11:59:00Z'))).toBe(true);
    expect(memoriesOpen(ended, at('2026-11-27T12:00:00Z'))).toBe(false);
  });

  it('cuenta atrás en palabras', () => {
    expect(expiryLabel(null, 0)).toBe('Se borran 7 días después de terminar el viaje');
    expect(expiryLabel(ended, at('2026-11-22T12:00:00Z'))).toBe('Se borran en 5 días');
    expect(expiryLabel(ended, at('2026-11-26T11:00:00Z'))).toBe('Se borran en 2 días');
    expect(expiryLabel(ended, at('2026-11-27T03:30:00Z'))).toBe('Se borran en 9 h');
    expect(expiryLabel(ended, at('2026-11-28T00:00:00Z'))).toBe('Ya se han borrado');
  });
});
