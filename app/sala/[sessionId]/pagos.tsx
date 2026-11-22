import { useCallback, useMemo, useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { AddExpenseSheet } from '@/components/pagos/AddExpenseSheet';
import { ExpenseList } from '@/components/pagos/ExpenseList';
import { SettlementCard } from '@/components/pagos/SettlementCard';
import { AppText, Button, Card, Notice, Screen, ScreenHeader } from '@/components/ui';
import { useSession } from '@/hooks/useSession';
import { useTripMoney } from '@/hooks/useTripMoney';
import { tripMoney } from '@/lib/tripMoney';
import { removeExpense } from '@/services/supabase/payments';
import { spacing, useTheme } from '@/theme';

/**
 * Pestaña Pagos. Durante el viaje: los peajes y el parking que va pagando cada uno, con la foto del
 * ticket (#26). Al finalizar: el reparto de la gasolina y los extras (#25) y pagar con PayPal o
 * Bizum (#27).
 */
export default function PagosScreen() {
  const { colors } = useTheme();
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
        error ? null : <ActivityIndicator color={colors.primary} style={styles.loader} />
      ) : finished ? (
        <>
          <SettlementCard
            money={tripMoney(expenses, payments, members.map((member) => member.user_id), myId)}
            people={members}
            myId={myId}
            pay={{ payees, onMarkPaid: markPaid }}
          />
          <View style={styles.block}>
            <AppText variant="heading">Gastos del viaje</AppText>
            <ExpenseList expenses={expenses} names={names} myId={myId} />
          </View>
        </>
      ) : (
        <>
          <Card>
            <AppText variant="heading">Cómo se reparte</AppText>
            <AppText color={colors.textSecondary}>
              Al finalizar, la gasolina (km × consumo × precio) y los peajes o el parking se reparten a partes iguales entre
              todos, conductor incluido. Quien haya pagado algo, lo recupera en el reparto.
            </AppText>
          </Card>
          <View style={styles.block}>
            <AppText variant="heading">Peajes, parking y otros</AppText>
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
  loader: { marginTop: spacing.lg },
  block: { gap: spacing.sm + 2 },
});
