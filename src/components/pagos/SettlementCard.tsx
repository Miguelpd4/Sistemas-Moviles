import Ionicons from '@expo/vector-icons/Ionicons';
import { StyleSheet, View } from 'react-native';

import { AppText, Avatar, Badge, Glow } from '@/components/ui';
import { formatEuros } from '@/lib/format';
import type { MoneyPayment, TripMoney } from '@/lib/tripMoney';
import { radius, spacing, useStyles, useTheme, type Palette } from '@/theme';

type Person = { user_id: string; display_name: string; avatar_kind: string; avatar_value: string };

type Props = {
  money: TripMoney;
  people: readonly Person[];
  myId: string | null;
};

/**
 * Reparto del viaje (#25): lo que me toca pagar o cobrar, de dónde sale (gasolina y extras) y
 * todos los pagos entre ocupantes con su estado.
 */
export function SettlementCard({ money, people, myId }: Props) {
  const { colors } = useTheme();
  const styles = useStyles(makeStyles);
  const byId = new Map(people.map((person) => [person.user_id, person]));
  const name = (id: string) => (id === myId ? 'Tú' : (byId.get(id)?.display_name ?? 'Alguien'));
  const pending = (list: readonly MoneyPayment[]) =>
    list.filter((p) => p.status !== 'pagado').reduce((sum, p) => sum + p.amount_cents, 0);
  const toPay = pending(money.iPay);
  const toReceive = pending(money.iReceive);
  const share = myId !== null ? (money.shares[myId] ?? 0) : Math.max(0, ...Object.values(money.shares));
  // Los míos primero, después los del resto.
  const others = [...money.payments].sort(
    (a, b) => Number(b.from_user === myId || b.to_user === myId) - Number(a.from_user === myId || a.to_user === myId),
  );

  const headline =
    money.totalCents === 0
      ? { label: 'Este viaje no tiene gastos', value: formatEuros(0) }
      : toPay > 0
        ? { label: 'Te toca pagar', value: formatEuros(toPay) }
        : toReceive > 0
          ? { label: 'Te tienen que pagar', value: formatEuros(toReceive) }
          : { label: 'Estás en paz', value: formatEuros(0) };

  return (
    <View style={styles.card}>
      <Glow cy={0.15} />
      <View style={styles.head} accessible accessibilityLabel={`${headline.label}: ${headline.value}`}>
        <AppText color={colors.textSecondary}>{headline.label}</AppText>
        <AppText variant="hero" color={colors.primaryText}>
          {headline.value}
        </AppText>
      </View>

      <View style={styles.lines}>
        <Line icon="flame-outline" label="Gasolina" value={formatEuros(money.fuelCents)} />
        {money.extrasCents > 0 ? <Line icon="receipt-outline" label="Peajes, parking y otros" value={formatEuros(money.extrasCents)} /> : null}
        <Line icon="wallet-outline" label="Total del viaje" value={formatEuros(money.totalCents)} strong />
        <Line icon="people-outline" label="A cada uno le toca (conductor incluido)" value={formatEuros(share)} />
      </View>

      {others.length > 0 ? (
        <View style={styles.list}>
          <AppText variant="heading">Quién paga a quién</AppText>
          {others.map((payment) => {
            const from = byId.get(payment.from_user);
            const paid = payment.status === 'pagado';
            return (
              <View
                key={`${payment.from_user}-${payment.to_user}`}
                style={styles.payment}
                accessible
                accessibilityLabel={`${name(payment.from_user)} paga ${formatEuros(payment.amount_cents)} a ${name(payment.to_user)}. ${paid ? 'Pagado' : 'Pendiente'}`}
              >
                {from ? <Avatar kind={from.avatar_kind} value={from.avatar_value} size={36} /> : null}
                <View style={styles.paymentText}>
                  <AppText variant="bodyStrong" numberOfLines={1}>
                    {name(payment.from_user)} → {name(payment.to_user)}
                  </AppText>
                  <AppText variant="caption" color={colors.textSecondary}>
                    {formatEuros(payment.amount_cents)}
                  </AppText>
                </View>
                <Badge label={paid ? 'Pagado' : 'Pendiente'} tone={paid ? 'success' : 'neutral'} />
              </View>
            );
          })}
        </View>
      ) : money.totalCents > 0 ? (
        <AppText variant="caption" color={colors.textSecondary}>
          Nadie tiene que pagar a nadie en este viaje.
        </AppText>
      ) : null}

      <AppText variant="caption" color={colors.textTertiary} style={styles.center}>
        Pagar con PayPal o Bizum y marcarlo como pagado llega en la próxima versión.
      </AppText>
    </View>
  );
}

function Line({ icon, label, value, strong = false }: { icon: keyof typeof Ionicons.glyphMap; label: string; value: string; strong?: boolean }) {
  const { colors } = useTheme();
  return (
    <View style={lineStyles.row} accessible accessibilityLabel={`${label}: ${value}`}>
      <Ionicons name={icon} size={18} color={colors.textTertiary} />
      <AppText variant={strong ? 'bodyStrong' : 'body'} color={strong ? colors.text : colors.textSecondary} style={lineStyles.label}>
        {label}
      </AppText>
      <AppText variant={strong ? 'bodyStrong' : 'body'}>{value}</AppText>
    </View>
  );
}

const lineStyles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  label: { flex: 1 },
});

const makeStyles = (c: Palette) =>
  StyleSheet.create({
    card: {
      gap: spacing.md,
      padding: spacing.lg,
      borderRadius: radius.lg,
      backgroundColor: c.surfaceRaised,
      borderWidth: 1,
      borderColor: c.border,
      overflow: 'hidden',
    },
    head: { alignItems: 'center', gap: spacing.xs },
    lines: { gap: spacing.sm },
    list: { gap: spacing.sm },
    payment: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingVertical: spacing.xs },
    paymentText: { flex: 1, gap: 2 },
    center: { textAlign: 'center' },
  });
