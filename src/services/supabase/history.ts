import { toAppError } from '@/lib/errors';
import type { HistoryMember, HistorySession } from '@/lib/history';
import type { MoneyExpense, MoneyPayment } from '@/lib/tripMoney';

import { supabase } from './client';

/**
 * Historial (#34): todo lo de mis viajes terminados. RLS solo deja ver los viajes en los que
 * estaba (is_member), así que basta con pedir por los id de mis viajes.
 */
export type HistoryData = {
  sessions: HistorySession[];
  members: HistoryMember[];
  metrics: { session_id: string; distance_m: number; duration_s: number }[];
  expenses: (MoneyExpense & { session_id: string })[];
  payments: (MoneyPayment & { session_id: string })[];
};

const FAIL = 'No se ha podido cargar tu historial.';

export async function getHistory(myId: string): Promise<HistoryData> {
  const mine = await supabase.from('session_members').select('session_id').eq('user_id', myId).eq('status', 'dentro').limit(200);
  if (mine.error) throw toAppError(mine.error, FAIL);
  const ids = [...new Set(mine.data.map((row) => row.session_id))];
  if (ids.length === 0) return { sessions: [], members: [], metrics: [], expenses: [], payments: [] };

  const sessions = await supabase
    .from('sessions')
    .select(
      'id, started_at, ended_at, created_at, destination_name, cars ( name, nfc_code, make, model, version, color, photo_path, model_image_url )',
    )
    .in('id', ids)
    .eq('status', 'finalizada');
  if (sessions.error) throw toAppError(sessions.error, FAIL);
  const done = sessions.data.map((row) => row.id);
  if (done.length === 0) return { sessions: [], members: [], metrics: [], expenses: [], payments: [] };

  const [members, metrics, expenses, payments] = await Promise.all([
    supabase
      .from('session_members')
      .select('session_id, user_id, display_name, role, avatar_kind, avatar_value')
      .in('session_id', done)
      .eq('status', 'dentro'),
    supabase.from('trip_metrics').select('session_id, distance_m, duration_s').in('session_id', done),
    supabase.from('expenses').select('session_id, kind, amount_cents, paid_by').in('session_id', done),
    supabase.from('payments').select('session_id, from_user, to_user, amount_cents, status').in('session_id', done),
  ]);
  for (const result of [members, metrics, expenses, payments]) {
    if (result.error) throw toAppError(result.error, FAIL);
  }

  return {
    sessions: sessions.data.map((row) => ({
      id: row.id,
      startedAt: row.started_at,
      endedAt: row.ended_at,
      createdAt: row.created_at,
      destinationName: row.destination_name,
      car: {
        name: row.cars?.name ?? 'Coche',
        nfcCode: row.cars?.nfc_code ?? '',
        make: row.cars?.make ?? null,
        model: row.cars?.model ?? null,
        version: row.cars?.version ?? null,
        color: row.cars?.color ?? null,
        photoPath: row.cars?.photo_path ?? null,
        imageUrl: row.cars?.model_image_url ?? null,
      },
    })),
    members: (members.data ?? []).map((row) => ({
      sessionId: row.session_id,
      userId: row.user_id,
      name: row.display_name,
      role: row.role,
      avatarKind: row.avatar_kind,
      avatarValue: row.avatar_value,
    })),
    metrics: (metrics.data ?? []).map((row) => ({ session_id: row.session_id, distance_m: Number(row.distance_m), duration_s: Number(row.duration_s) })),
    expenses: expenses.data ?? [],
    payments: payments.data ?? [],
  };
}
