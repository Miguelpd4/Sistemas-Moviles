import { toAppError } from '@/lib/errors';
import type { ExpenseRow, PaymentRow } from '@/types/database';

import { supabase } from './client';

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
