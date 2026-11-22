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
