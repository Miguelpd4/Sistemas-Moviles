/** Pagar fuera de la app (#27): PayPal.me con el importe y Bizum con teléfono e importe. */

/** Céntimos como importe con punto, para enlaces: 334 → "3.34". */
export function plainAmount(cents: number): string {
  return (Math.max(0, Math.round(cents)) / 100).toFixed(2);
}

/** https://paypal.me/<usuario>/<importe>EUR, o null si no hay usuario válido. */
export function paypalMeUrl(username: string | null | undefined, cents: number): string | null {
  const user = username?.trim();
  if (!user || !/^[A-Za-z0-9]{1,20}$/.test(user)) return null;
  return `https://paypal.me/${user}/${plainAmount(cents)}EUR`;
}

/** Lo que se copia para Bizum: «600123123 · 3,34 €». null si no hay teléfono. */
export function bizumText(phone: string | null | undefined, cents: number): string | null {
  const number = phone?.replace(/\s+/g, '');
  if (!number) return null;
  return `${number} · ${plainAmount(cents).replace('.', ',')} €`;
}
