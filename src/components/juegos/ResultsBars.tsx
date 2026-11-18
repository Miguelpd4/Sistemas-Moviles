import Ionicons from '@expo/vector-icons/Ionicons';
import { memo } from 'react';
import { StyleSheet, View } from 'react-native';

import { AppText, Avatar } from '@/components/ui';
import type { TallyResult } from '@/lib/games/tally';
import { radius, spacing, useTheme } from '@/theme';

import type { GameOption } from './OptionList';

type Props = { result: TallyResult; options: readonly GameOption[] };

/** Resultado de una ronda: barras con los votos de cada opción (persona o canción) y trofeo para quien gana. */
function ResultsBarsBase({ result, options }: Props) {
  const { colors } = useTheme();
  const byId = new Map(options.map((option) => [option.id, option]));
  const max = Math.max(1, ...result.rows.map((row) => row.votes));

  return (
    <View style={styles.list}>
      {result.rows.map((row) => {
        const option = byId.get(row.id);
        const winner = result.winners.includes(row.id);
        return (
          <View key={row.id} style={styles.row} accessible accessibilityLabel={`${row.label}: ${row.votes} votos${winner ? ', gana' : ''}`}>
            {option?.avatarValue ? (
              <Avatar kind={option.avatarKind ?? 'preset'} value={option.avatarValue} size={40} />
            ) : (
              <View style={[styles.icon, { backgroundColor: colors.primarySoft }]}>
                <Ionicons name="musical-notes" size={20} color={colors.primary} />
              </View>
            )}
            <View style={styles.barBlock}>
              <View style={styles.labelRow}>
                <AppText variant="bodyStrong" numberOfLines={1} style={styles.flex}>
                  {row.label}
                </AppText>
                {winner ? <Ionicons name="trophy" size={18} color={colors.primary} /> : null}
                <AppText variant="heading" color={winner ? colors.primaryText : colors.textSecondary}>
                  {row.votes}
                </AppText>
              </View>
              <View style={[styles.track, { backgroundColor: colors.surfaceStrong }]}>
                <View
                  style={[
                    styles.fill,
                    { width: `${(row.votes / max) * 100}%`, backgroundColor: winner ? colors.primary : colors.borderStrong },
                  ]}
                />
              </View>
            </View>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  list: { gap: spacing.md },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  barBlock: { flex: 1, gap: 6 },
  labelRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  flex: { flex: 1 },
  icon: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  track: { height: 10, borderRadius: radius.pill, overflow: 'hidden' },
  fill: { height: 10, borderRadius: radius.pill, minWidth: 4 },
});

export const ResultsBars = memo(ResultsBarsBase);
