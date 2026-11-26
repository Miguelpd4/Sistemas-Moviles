import Ionicons from '@expo/vector-icons/Ionicons';
import { router } from 'expo-router';
import { memo } from 'react';
import { StyleSheet, View } from 'react-native';

import { AppText, PressableScale } from '@/components/ui';
import { formatEuros } from '@/lib/format';
import { fonts, radius, spacing, useStyles, useTheme, type Palette } from '@/theme';

/** Lo pendiente de todos los viajes, en Inicio: cuánto debes y cuánto te deben. Lleva a Cuentas. */
function AccountsSummaryBase({ oweCents, owedCents }: { oweCents: number; owedCents: number }) {
  const { colors } = useTheme();
  const styles = useStyles(makeStyles);
  return (
    <PressableScale
      accessibilityRole="button"
      accessibilityLabel={`Cuentas pendientes. Debes ${formatEuros(oweCents)}. Te deben ${formatEuros(owedCents)}. Abrir Cuentas`}
      onPress={() => router.push('/cuentas')}
      style={styles.card}
      pressedStyle={{ backgroundColor: colors.surfaceStrong }}
    >
      <View style={styles.header}>
        <AppText variant="overline" color={colors.textSecondary}>
          Cuentas pendientes
        </AppText>
        <Ionicons name="chevron-forward" size={18} color={colors.textTertiary} />
      </View>
      <View style={styles.row}>
        <View style={styles.half}>
          <AppText variant="caption" color={colors.textSecondary}>
            Debes
          </AppText>
          <AppText style={[styles.amount, { color: oweCents > 0 ? colors.danger : colors.textTertiary }]} numberOfLines={1} adjustsFontSizeToFit>
            {formatEuros(oweCents)}
          </AppText>
        </View>
        <View style={[styles.divider, { backgroundColor: colors.border }]} />
        <View style={styles.half}>
          <AppText variant="caption" color={colors.textSecondary}>
            Te deben
          </AppText>
          <AppText style={[styles.amount, { color: owedCents > 0 ? colors.success : colors.textTertiary }]} numberOfLines={1} adjustsFontSizeToFit>
            {formatEuros(owedCents)}
          </AppText>
        </View>
      </View>
    </PressableScale>
  );
}

export const AccountsSummary = memo(AccountsSummaryBase);

const makeStyles = (c: Palette) =>
  StyleSheet.create({
    card: { gap: spacing.sm, padding: spacing.md + 2, borderRadius: radius.lg, backgroundColor: c.surface, borderWidth: 1, borderColor: c.border },
    header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    row: { flexDirection: 'row', alignItems: 'center' },
    half: { flex: 1, gap: 2 },
    divider: { width: 1, alignSelf: 'stretch', marginHorizontal: spacing.md },
    amount: { fontFamily: fonts.black, fontSize: 28, lineHeight: 33, letterSpacing: -0.9 },
  });
