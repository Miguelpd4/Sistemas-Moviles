/**
 * Asientos del coche visto desde arriba. 1 = conductor, 2 = copiloto,
 * del 3 en adelante los de atrás, de izquierda a derecha y en filas de hasta 3.
 */
export function seatLayout(seats: number): number[][] {
  const total = Math.max(2, Math.min(9, Math.floor(seats)));
  const rows: number[][] = [[1, 2]];
  for (let seat = 3; seat <= total; seat += 3) {
    const row: number[] = [];
    for (let s = seat; s < seat + 3 && s <= total; s += 1) row.push(s);
    rows.push(row);
  }
  return rows;
}

export function seatLabel(seat: number): string {
  if (seat === 1) return 'Conductor';
  if (seat === 2) return 'Copiloto';
  return `Asiento ${seat}`;
}

/** Asientos que un pasajero puede elegir (todos menos el del conductor y los ocupados). */
export function freeSeats(seats: number, taken: readonly number[]): number[] {
  return seatLayout(seats)
    .flat()
    .filter((seat) => seat !== 1 && !taken.includes(seat));
}
