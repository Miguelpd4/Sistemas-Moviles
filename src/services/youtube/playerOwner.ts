/**
 * Qué Modo conductor manda en la música (#57). Si por la navegación quedan dos pantallas del Modo
 * conductor abiertas a la vez, solo suena la última que se ha mostrado: así nunca se oye doble.
 */

let owner: symbol | null = null;
const listeners = new Set<() => void>();

function notify() {
  listeners.forEach((listener) => listener());
}

export function claimPlayer(id: symbol): void {
  if (owner === id) return;
  owner = id;
  notify();
}

export function releasePlayer(id: symbol): void {
  if (owner !== id) return;
  owner = null;
  notify();
}

export function getPlayerOwner(): symbol | null {
  return owner;
}

export function subscribePlayerOwner(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}
