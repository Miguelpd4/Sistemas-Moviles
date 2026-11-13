/**
 * Reparto de gastos. Todo en céntimos enteros para que la suma cuadre siempre al céntimo.
 * Debe dar lo mismo que la RPC `end_trip` (Sprint 3).
 */

/** Coste del combustible: km × (L/100 km) / 100 × €/L, en céntimos redondeados. */
export function fuelCostCents(distanceM: number, consumptionL100km: number, priceEurL: number): number {
  if (![distanceM, consumptionL100km, priceEurL].every(Number.isFinite)) {
    throw new RangeError('Datos de combustible no válidos');
  }
  if (distanceM <= 0 || consumptionL100km <= 0 || priceEurL <= 0) return 0;
  return Math.round((distanceM / 1000) * (consumptionL100km / 100) * priceEurL * 100);
}

/**
 * Reparte `totalCents` a partes iguales. Los primeros `total % n` de la lista (en el orden dado)
 * reciben 1 céntimo más.
 */
export function splitEqually(totalCents: number, memberIds: readonly string[]): Record<string, number> {
  if (!Number.isInteger(totalCents) || totalCents < 0) {
    throw new RangeError(`Importe no válido: ${totalCents}`);
  }
  const result: Record<string, number> = {};
  const n = memberIds.length;
  if (n === 0) return result;

  const base = Math.floor(totalCents / n);
  const remainder = totalCents % n;
  memberIds.forEach((id, index) => {
    result[id] = base + (index < remainder ? 1 : 0);
  });
  return result;
}
