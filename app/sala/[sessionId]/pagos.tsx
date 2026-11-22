import { ActivityIndicator, StyleSheet } from 'react-native';

import { SettlementCard } from '@/components/pagos/SettlementCard';
import { EmptyState, Notice, Screen, ScreenHeader } from '@/components/ui';
import { useSession } from '@/hooks/useSession';
import { useTripMoney } from '@/hooks/useTripMoney';
import { tripMoney } from '@/lib/tripMoney';
import { spacing, useTheme } from '@/theme';

/**
 * Pestaña Pagos (#25): mientras dura el viaje explica cómo se reparte; al finalizar, el reparto con
 * lo que paga cada uno, con PayPal, Bizum y «Ya he pagado» (#27). Los gastos extra (#26) llegan después.
 */
export default function PagosScreen() {
  const { colors } = useTheme();
  const { sessionId, session, members, myId } = useSession();
  const finished = session?.status === 'finalizada';
  const { expenses, payments, payees, error, markPaid } = useTripMoney(sessionId, finished);

  return (
    <Screen>
      <ScreenHeader eyebrow="Gastos del viaje" title="Pagos" />
      {!finished ? (
        <EmptyState
          icon="card-outline"
          title="El reparto se hace al finalizar"
          description="Cuando el conductor finalice el viaje, la gasolina (km × consumo × precio) se reparte a partes iguales entre todos, conductor incluido, y verás aquí lo que te toca."
        />
      ) : error ? (
        <Notice message={error} />
      ) : expenses === null || payments === null ? (
        <ActivityIndicator color={colors.primary} style={styles.loader} />
      ) : (
        <SettlementCard
          money={tripMoney(expenses, payments, members.map((member) => member.user_id), myId)}
          people={members}
          myId={myId}
          pay={{ payees, onMarkPaid: markPaid }}
        />
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  loader: { marginTop: spacing.lg },
});
