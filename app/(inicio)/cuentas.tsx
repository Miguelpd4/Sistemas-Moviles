import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { PaymentActions } from '@/components/pagos/PaymentActions';
import { AppText, Badge, EmptyState, Notice, Screen, ScreenHeader } from '@/components/ui';
import { useAccounts } from '@/hooks/useAccounts';
import { useAuth } from '@/hooks/useAuth';
import { summarizeAccounts, type AccountPayment } from '@/lib/accounts';
import { formatEuros } from '@/lib/format';
import { radius, spacing, useStyles, useTheme, type Palette } from '@/theme';

const tripDate = (iso: string | undefined) =>
  iso ? new Date(iso).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' }) : 'un viaje';

/**
 * Cuentas (#28): lo que debes y lo que te deben de todos tus viajes, con PayPal, Bizum y «Ya he
 * pagado» en cada deuda pendiente (#27), y lo último que ya está saldado.
 */
export default function CuentasScreen() {
  const { colors } = useTheme();
  const styles = useStyles(makeStyles);
  const { user } = useAuth();
  const myId = user?.id ?? null;
  const { data, error, markPaid } = useAccounts(myId);
  const accounts = data && myId ? summarizeAccounts(data.payments, myId) : null;

  const describe = (p: AccountPayment) => {
    const other = p.from_user === myId ? p.to_user : p.from_user;
    const name = data?.names[other] ?? 'Alguien';
    return p.from_user === myId ? `Pagas a ${name}` : `${name} te paga`;
  };

  return (
    <Screen>
      <ScreenHeader eyebrow="De todos tus viajes" title="Cuentas" />
      {error ? <Notice message={error} /> : null}
      {myId === null ? (
        <EmptyState icon="wallet-outline" title="Estás en paz con todos" description="Cuando hagas un viaje, aquí verás lo que debes y lo que te deben." />
      ) : accounts === null ? (
        error ? null : <ActivityIndicator color={colors.primary} style={styles.loader} />
      ) : (
        <>
          <View style={styles.totals}>
            <View style={styles.total} accessible accessibilityLabel={`Debes ${formatEuros(accounts.oweCents)}`}>
              <AppText color={colors.textSecondary}>Debes</AppText>
              <AppText variant="title" color={accounts.oweCents > 0 ? colors.primaryText : colors.text}>
                {formatEuros(accounts.oweCents)}
              </AppText>
            </View>
            <View style={styles.total} accessible accessibilityLabel={`Te deben ${formatEuros(accounts.owedCents)}`}>
              <AppText color={colors.textSecondary}>Te deben</AppText>
              <AppText variant="title" color={accounts.owedCents > 0 ? colors.success : colors.text}>
                {formatEuros(accounts.owedCents)}
              </AppText>
            </View>
          </View>

          {accounts.pending.length === 0 ? (
            <EmptyState icon="checkmark-circle-outline" title="Estás en paz con todos" description="No tienes nada pendiente de pagar ni de cobrar." />
          ) : (
            <View style={styles.block}>
              <AppText variant="heading">Pendiente</AppText>
              {accounts.pending.map((p) => (
                <View key={p.id} style={styles.item}>
                  <View style={styles.row}>
                    <View style={styles.text}>
                      <AppText variant="bodyStrong">{describe(p)}</AppText>
                      <AppText variant="caption" color={colors.textSecondary}>
                        Viaje del {tripDate(data?.dates[p.session_id])}
                      </AppText>
                    </View>
                    <AppText variant="heading">{formatEuros(p.amount_cents)}</AppText>
                  </View>
                  <PaymentActions
                    paymentId={p.id}
                    amountCents={p.amount_cents}
                    iPay={p.from_user === myId}
                    payee={data?.payees[p.to_user]}
                    onMarkPaid={markPaid}
                  />
                </View>
              ))}
            </View>
          )}

          {accounts.paid.length > 0 ? (
            <View style={styles.block}>
              <AppText variant="heading">Ya saldado</AppText>
              {accounts.paid.map((p) => (
                <View key={p.id} style={styles.row} accessible accessibilityLabel={`${describe(p)} ${formatEuros(p.amount_cents)}, pagado`}>
                  <View style={styles.text}>
                    <AppText>{describe(p)}</AppText>
                    <AppText variant="caption" color={colors.textSecondary}>
                      Viaje del {tripDate(data?.dates[p.session_id])}
                    </AppText>
                  </View>
                  <AppText color={colors.textSecondary}>{formatEuros(p.amount_cents)}</AppText>
                  <Badge label="Pagado" tone="success" />
                </View>
              ))}
            </View>
          ) : null}
        </>
      )}
    </Screen>
  );
}

const makeStyles = (c: Palette) =>
  StyleSheet.create({
    loader: { marginTop: spacing.lg },
    totals: { flexDirection: 'row', gap: spacing.sm + 4 },
    total: { flex: 1, gap: 4, padding: spacing.md, borderRadius: radius.lg, backgroundColor: c.surface },
    block: { gap: spacing.sm + 2 },
    item: { gap: spacing.sm, padding: spacing.md, borderRadius: radius.lg, backgroundColor: c.surface },
    row: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
    text: { flex: 1, gap: 2 },
  });
