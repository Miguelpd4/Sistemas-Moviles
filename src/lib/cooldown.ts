/** ¿Se puede volver a hacer algo que tiene un tiempo de espera? (S2-04, Pedir parada). */
export function canTrigger(lastAt: number | null, now: number, cooldownMs: number): boolean {
  if (lastAt === null) return true;
  return now - lastAt >= cooldownMs;
}

/** Segundos que faltan para poder repetir (redondeado hacia arriba); 0 si ya se puede. */
export function secondsLeft(lastAt: number | null, now: number, cooldownMs: number): number {
  if (lastAt === null) return 0;
  return Math.max(0, Math.ceil((cooldownMs - (now - lastAt)) / 1000));
}
