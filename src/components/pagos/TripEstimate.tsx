import { StyleSheet, View } from 'react-native';

import { AppText, Avatar, Glow, IconTile } from '@/components/ui';
import { useSession } from '@/hooks/useSession';
import { useTripMetrics } from '@/hooks/useTripMetrics';
import { formatEuros, formatKm } from '@/lib/format';
import { fuelCostCents, splitEqually } from '@/lib/split';
import { fonts, radius, spacing, useStyles, useTheme, type Palette } from '@/theme';

/**
 * Pagos durante el viaje: lo que lleva costando (gasolina hasta ahora más peajes y parking) y lo
 * que te tocaría si terminara ahora, a partes iguales entre todos, conductor incluido. Es una
 * estimación: el reparto de verdad lo hace end_trip al finalizar.
 */
export function TripEstimate({ extrasCents }: { extrasCents: number }) {
  const { colors } = useTheme();
  const styles = useStyles(makeStyles);
  const { session, members, myId } = useSession();
  const metrics = useTripMetrics();
  const started = session?.status === 'en_curso';
  const distance = metrics?.distance_m ?? 0;
  const price = session?.fuelPriceEurL ?? null;
  const fuel = started && price && session ? fuelCostCents(distance, session.consumptionL100km, price) : 0;
  const total = fuel + extrasCents;
  const ids = members.map((member) => member.user_id);
  const shares = ids.length > 0 ? splitEqually(total, ids) : {};
  const mine = myId !== null ? (shares[myId] ?? 0) : 0;

  return (
    <View style={styles.card} accessible accessibilityLabel={`Lleváis ${formatEuros(total)}. Te tocaría ${formatEuros(mine)}.`}>
      <Glow cy={0.05} cx={0.85} />
      <AppText variant="overline" color={colors.primaryText}>
        {started ? 'Lleváis gastado' : 'Aún no habéis salido'}
      </AppText>
      <AppText style={styles.total} numberOfLines={1} adjustsFontSizeToFit>
        {formatEuros(total)}
      </AppText>
      <View style={styles.mine}>
        <AppText color={colors.textSecondary}>Te tocaría</AppText>
        <AppText variant="heading" color={colors.primaryText}>
          {formatEuros(mine)}
        </AppText>
      </View>

      <View style={styles.rows}>
        <View style={styles.row}>
          <IconTile icon="gas-station" tint="amber" size={36} />
          <View style={styles.flex}>
            <AppText variant="bodyStrong">Gasolina</AppText>
            <AppText variant="caption" color={colors.textSecondary}>
              {started ? `${formatKm(distance)} recorridos` : 'Empieza a contar al iniciar el viaje'}
            </AppText>
          </View>
          <AppText variant="bodyStrong">{formatEuros(fuel)}</AppText>
        </View>
        <View style={styles.row}>
          <IconTile icon="boom-gate" tint="blue" size={36} />
          <View style={styles.flex}>
            <AppText variant="bodyStrong">Peajes, parking y otros</AppText>
            <AppText variant="caption" color={colors.textSecondary}>
              Quien los pagó los recupera en el reparto
            </AppText>
          </View>
          <AppText variant="bodyStrong">{formatEuros(extrasCents)}</AppText>
        </View>
      </View>

      <View style={styles.people}>
        <View style={styles.avatars}>
          {members.slice(0, 6).map((member, index) => (
            <View key={member.user_id} style={[styles.avatar, index > 0 && styles.overlap]}>
              <Avatar kind={member.avatar_kind} value={member.avatar_value} size={30} />
            </View>
          ))}
        </View>
        <AppText variant="caption" color={colors.textSecondary} style={styles.flex}>
          A partes iguales entre {members.length}, conductor incluido. El reparto final se hace al terminar.
        </AppText>
      </View>
    </View>
  );
}

const makeStyles = (c: Palette) =>
  StyleSheet.create({
    card: {
      gap: spacing.sm,
      padding: spacing.lg - 4,
      borderRadius: radius.lg,
      backgroundColor: c.surfaceRaised,
      borderWidth: 1,
      borderColor: c.border,
      overflow: 'hidden',
    },
    total: { fontFamily: fonts.black, fontSize: 52, lineHeight: 58, letterSpacing: -2, color: c.text },
    mine: { flexDirection: 'row', alignItems: 'baseline', gap: spacing.sm },
    rows: { gap: spacing.sm + 4, marginTop: spacing.sm, paddingTop: spacing.md, borderTopWidth: 1, borderTopColor: c.border },
    row: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm + 4 },
    flex: { flex: 1 },
    people: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm + 4, marginTop: spacing.sm },
    avatars: { flexDirection: 'row' },
    avatar: { borderRadius: 18, borderWidth: 2, borderColor: c.surfaceRaised },
    overlap: { marginLeft: -10 },
  });
