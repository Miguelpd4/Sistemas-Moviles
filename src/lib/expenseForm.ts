/** Formulario de gasto extra (#26): peaje, parking u otro, con importe en euros. */

export type ExtraKind = 'peaje' | 'parking' | 'otro';

export const EXTRA_KINDS: readonly { kind: ExtraKind; label: string }[] = [
  { kind: 'peaje', label: 'Peaje' },
  { kind: 'parking', label: 'Parking' },
  { kind: 'otro', label: 'Otro' },
];

/** Lo que admite la base de datos por gasto: 1.000 €. */
export const MAX_EXPENSE_CENTS = 100_000;

/** «3», «3,5», «3.50», «12,30 €» → céntimos. null si no es un importe válido (o es 0, o pasa de 1.000 €). */
export function parseEurosToCents(text: string): number | null {
  const clean = text.replace(/€/g, '').replace(/\s+/g, '').replace(',', '.');
  if (!/^\d{1,4}(\.\d{1,2})?$/.test(clean)) return null;
  const cents = Math.round(Number(clean) * 100);
  return cents > 0 && cents <= MAX_EXPENSE_CENTS ? cents : null;
}

export function kindLabel(kind: string): string {
  if (kind === 'combustible') return 'Gasolina';
  return EXTRA_KINDS.find((item) => item.kind === kind)?.label ?? 'Gasto';
}
