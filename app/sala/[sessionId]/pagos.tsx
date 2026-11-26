import { useCallback, useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { AddExpenseSheet } from '@/components/pagos/AddExpenseSheet';
import { ExpenseList } from '@/components/pagos/ExpenseList';
import { SettlementCard } from '@/components/pagos/SettlementCard';
import { TripEstimate } from '@/components/pagos/TripEstimate';
import { Button, Notice, Screen, ScreenHeader, SectionHeader, SkeletonCards } from '@/components/ui';
import { useSession } from '@/hooks/useSession';
import { useTripMoney } from '@/hooks/useTripMoney';
import { tripMoney } from '@/lib/tripMoney';
import { removeExpense } from '@/services/supabase/payments';
import { spacing } from '@/theme';

/**
 * Pestaña Pagos. Durante el viaje: los peajes y el parking que va pagando cada uno, con la foto del
 * ticket (#26). Al finalizar: el reparto de la gasolina y los extras (#25) y pagar con PayPal o
 * Bizum (#27).
 */
export default function PagosScreen() {
  const { sessionId, session, members, myId } = useSession();
  const finished = session?.status === 'finalizada';
  const { expenses, payments, payees, error, markPaid, reload } = useTripMoney(sessionId, true);
  const [adding, setAdding] = useState(false);

  const names = useMemo(() => Object.fromEntries(members.map((member) => [member.user_id, member.display_name])), [members]);
  const extras = useMemo(() => (expenses ?? []).filter((expense) => expense.kind !== 'combustible'), [expenses]);
  const remove = useCallback(
    async (id: string) => {
      await removeExpense(id);
      reload();
    },
    [reload],
  );

  return (
    <Screen>
      <ScreenHeader eyebrow="Gastos del viaje" title="Pagos" />
      {error ? <Notice message={error} /> : null}
      {expenses === null || payments === null ? (
        error ? null : <SkeletonCards count={2} />
      ) : finished ? (
        <>
          <SettlementCard
            money={tripMoney(expenses, payments, members.map((member) => member.user_id), myId)}
            people={members}
            myId={myId}
            pay={{ payees, onMarkPaid: markPaid }}
          />
          <View style={styles.block}>
            <SectionHeader title="Gastos del viaje" />
            <ExpenseList expenses={expenses} names={names} myId={myId} />
          </View>
        </>
      ) : (
        <>
          <TripEstimate extrasCents={extras.reduce((sum, expense) => sum + expense.amount_cents, 0)} />
          <View style={styles.block}>
            <SectionHeader title="Peajes y parking" aside={extras.length > 0 ? String(extras.length) : undefined} />
            <ExpenseList expenses={extras} names={names} myId={myId} onRemove={remove} />
            {myId !== null ? <Button label="Añadir peaje o parking" icon="add" onPress={() => setAdding(true)} /> : null}
          </View>
          {myId !== null ? (
            <AddExpenseSheet
              visible={adding}
              sessionId={sessionId}
              userId={myId}
              onClose={() => setAdding(false)}
              onSaved={() => {
                setAdding(false);
                reload();
              }}
            />
          ) : null}
        </>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  block: { gap: spacing.sm + 4 },
});
