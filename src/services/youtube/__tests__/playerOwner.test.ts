import { claimPlayer, getPlayerOwner, releasePlayer, subscribePlayerOwner } from '../playerOwner';

describe('playerOwner: solo suena un Modo conductor', () => {
  it('manda el último que se muestra y avisa a los demás', () => {
    const first = Symbol('primero');
    const second = Symbol('segundo');
    const listener = jest.fn();
    const off = subscribePlayerOwner(listener);

    claimPlayer(first);
    expect(getPlayerOwner()).toBe(first);
    claimPlayer(second);
    expect(getPlayerOwner()).toBe(second);
    expect(listener).toHaveBeenCalledTimes(2);

    // Cerrar el que no manda no cambia nada; cerrar el que manda deja la música libre.
    releasePlayer(first);
    expect(getPlayerOwner()).toBe(second);
    releasePlayer(second);
    expect(getPlayerOwner()).toBeNull();

    // Volver a reclamar lo que ya es tuyo no avisa otra vez.
    claimPlayer(first);
    claimPlayer(first);
    expect(listener).toHaveBeenCalledTimes(4);
    off();
    releasePlayer(first);
    expect(listener).toHaveBeenCalledTimes(4);
  });
});
