/** Recuento de votos de una ronda (S2-09). */

export type TallyOption = { id: string; label: string };
export type TallyAnswer = { userId: string; option: string };
export type TallyRow = TallyOption & { votes: number; voters: string[] };

export type TallyResult = {
  rows: TallyRow[];
  /** Opciones más votadas (varias si hay empate; ninguna si no hay votos). */
  winners: string[];
  total: number;
};

/** Votos por opción, de más a menos (a igualdad, en el orden original). */
export function tally(answers: readonly TallyAnswer[], options: readonly TallyOption[]): TallyResult {
  const rows: TallyRow[] = options.map((option) => ({ ...option, votes: 0, voters: [] }));
  const byId = new Map(rows.map((row) => [row.id, row]));
  let total = 0;
  for (const answer of answers) {
    const row = byId.get(answer.option);
    if (!row) continue;
    row.votes += 1;
    row.voters.push(answer.userId);
    total += 1;
  }
  const order = new Map(options.map((option, index) => [option.id, index]));
  rows.sort((a, b) => b.votes - a.votes || (order.get(a.id) ?? 0) - (order.get(b.id) ?? 0));
  const max = rows[0]?.votes ?? 0;
  const winners = max > 0 ? rows.filter((row) => row.votes === max).map((row) => row.id) : [];
  return { rows, winners, total };
}
