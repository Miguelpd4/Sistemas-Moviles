import { toAppError } from '@/lib/errors';
import type { ExtraKind } from '@/lib/expenseForm';
import type { ExpenseRow, PaymentRow } from '@/types/database';

import { supabase } from './client';
import { uploadTicket } from './storage';

/** Gastos y pagos del viaje (#25). Los crea end_trip al finalizar; aquí solo se leen (RLS: miembros). */

export type Expense = ExpenseRow;
export type Payment = PaymentRow;

export async function getTripMoney(sessionId: string): Promise<{ expenses: Expense[]; payments: Payment[] }> {
  const [expenses, payments] = await Promise.all([
    supabase.from('expenses').select('*').eq('session_id', sessionId).order('created_at', { ascending: true }),
    supabase.from('payments').select('*').eq('session_id', sessionId).order('amount_cents', { ascending: false }),
  ]);
  if (expenses.error) throw toAppError(expenses.error, 'No se han podido cargar los gastos del viaje.');
  if (payments.error) throw toAppError(payments.error, 'No se han podido cargar los pagos del viaje.');
  return { expenses: expenses.data, payments: payments.data };
}

/** Para pagar a alguien: su teléfono (Bizum) y su usuario de PayPal, si los ha puesto en Perfil. */
export type Payee = { phone: string | null; paypal: string | null };

export async function getPayees(userIds: readonly string[]): Promise<Record<string, Payee>> {
  if (userIds.length === 0) return {};
  const { data, error } = await supabase.from('profiles').select('id, phone, paypal_username').in('id', [...userIds]);
  if (error) throw toAppError(error, 'No se han podido cargar los datos para pagar.');
  return Object.fromEntries(data.map((row) => [row.id, { phone: row.phone, paypal: row.paypal_username }]));
}

/** #27 · Marca un pago como hecho (quien paga o quien cobra). */
export async function markPaymentPaid(paymentId: string): Promise<void> {
  const { error } = await supabase.rpc('mark_payment_paid', { p_payment_id: paymentId });
  if (error) throw toAppError(error, 'No se ha podido marcar el pago.');
}

/** #26 · Añade un peaje, parking u otro gasto pagado por mí, con la foto del ticket si la hay. */
export async function addExpense(input: {
  sessionId: string;
  userId: string;
  kind: ExtraKind;
  description: string;
  amountCents: number;
  receiptUri: string | null;
}): Promise<void> {
  const receiptPath = input.receiptUri ? await uploadTicket(input.sessionId, input.userId, input.receiptUri) : null;
  const { error } = await supabase.from('expenses').insert({
    session_id: input.sessionId,
    paid_by: input.userId,
    kind: input.kind,
    description: input.description.trim() || null,
    amount_cents: input.amountCents,
    receipt_path: receiptPath,
  });
  if (error) throw toAppError(error, 'No se ha podido guardar el gasto.');
}

/** #26 · Quita un gasto extra mío mientras el viaje no ha terminado. */
export async function removeExpense(id: string): Promise<void> {
  const { error } = await supabase.from('expenses').delete().eq('id', id);
  if (error) throw toAppError(error, 'No se ha podido quitar el gasto.');
}

/** #28 · Todos mis pagos (los que hago y los que me hacen), de todos los viajes. */
export async function getMyPayments(myId: string): Promise<Payment[]> {
  const { data, error } = await supabase
    .from('payments')
    .select('*')
    .or(`from_user.eq.${myId},to_user.eq.${myId}`)
    .order('created_at', { ascending: false })
    .limit(200);
  if (error) throw toAppError(error, 'No se han podido cargar tus cuentas.');
  return data;
}

/** Nombres de la gente con la que he viajado (RLS: compañeros de viaje). */
export async function getNames(userIds: readonly string[]): Promise<Record<string, string>> {
  if (userIds.length === 0) return {};
  const { data, error } = await supabase.from('profiles').select('id, display_name').in('id', [...userIds]);
  if (error) throw toAppError(error, 'No se han podido cargar los nombres.');
  return Object.fromEntries(data.map((row) => [row.id, row.display_name]));
}

/** Cuándo fue cada viaje (para «viaje del 22/11»). */
export async function getTripDates(sessionIds: readonly string[]): Promise<Record<string, string>> {
  if (sessionIds.length === 0) return {};
  const { data, error } = await supabase.from('sessions').select('id, created_at, ended_at').in('id', [...sessionIds]);
  if (error) throw toAppError(error, 'No se han podido cargar los viajes.');
  return Object.fromEntries(data.map((row) => [row.id, row.ended_at ?? row.created_at]));
}
