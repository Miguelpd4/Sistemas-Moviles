import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { memo } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';

import { AppText, Avatar } from '@/components/ui';
import { BINGO_SIZE, bingoItem, completedLines } from '@/lib/games/bingo';
import { radius, spacing, useTheme } from '@/theme';

/** Bingo de carretera (#48): el cartón de 3×3 y el ranking final. */

type CardProps = {
  card: readonly string[];
  marked: ReadonlySet<string>;
  disabled: boolean;
  /** Casilla que se está marcando ahora. */
  marking: string | null;
  onMark?: (item: string) => void;
};

function BingoCardBase({ card, marked, disabled, marking, onMark }: CardProps) {
  const { colors } = useTheme();
  const inLine = new Set(completedLines(card, marked).flat());
  return (
    <View style={styles.grid} accessibilityRole="list">
      {card.slice(0, BINGO_SIZE).map((id, position) => {
        const item = bingoItem(id);
        const done = marked.has(id);
        const line = inLine.has(position);
        return (
          <Pressable
            key={id}
            accessibilityRole="button"
            accessibilityLabel={`${item.label}${done ? ', marcada' : ''}${line ? ', en línea' : ''}`}
            accessibilityHint={done ? undefined : 'Tócala cuando la veas'}
            accessibilityState={{ disabled: disabled || done, checked: done, busy: marking === id }}
            disabled={disabled || done || marking !== null}
            onPress={() => onMark?.(id)}
            style={({ pressed }) => [
              styles.cell,
              {
                backgroundColor: line ? colors.primary : done ? colors.primarySoft : pressed ? colors.surfaceStrong : colors.surface,
                borderColor: done ? colors.primary : colors.border,
              },
            ]}
          >
            {marking === id ? (
              <ActivityIndicator color={colors.primary} />
            ) : (
              <MaterialCommunityIcons name={done ? 'check-bold' : item.icon} size={30} color={line ? colors.textOnPrimary : colors.primary} />
            )}
            <AppText
              variant="caption"
              color={line ? colors.textOnPrimary : colors.text}
              style={styles.center}
              numberOfLines={2}
              maxFontSizeMultiplier={1.3}
            >
              {item.label}
            </AppText>
          </Pressable>
        );
      })}
    </View>
  );
}
export const BingoCard = memo(BingoCardBase);

export type BingoRow = {
  id: string;
  name: string;
  avatarKind: string;
  avatarValue: string;
  marked: number;
  line: number | null;
  bingo: boolean;
  points: number;
};

/** Resultado: puntos de cada uno con su línea o su bingo. */
function BingoRankingBase({ rows }: { rows: readonly BingoRow[] }) {
  const { colors } = useTheme();
  if (rows.length === 0) {
    return (
      <AppText color={colors.textSecondary} style={styles.center}>
        Nadie ha marcado nada esta vez. ¡Otro cartón!
      </AppText>
    );
  }
  return (
    <View style={styles.list}>
      {rows.map((row, index) => {
        const status = row.bingo ? '¡Bingo!' : row.line ? `Línea (${row.line}ª)` : `${row.marked} de ${BINGO_SIZE}`;
        return (
          <View
            key={row.id}
            style={[styles.row, { backgroundColor: colors.surface }]}
            accessible
            accessibilityLabel={`${index + 1}º ${row.name}: ${status}, ${row.points} puntos`}
          >
            <AppText variant="heading" color={colors.primaryText} style={styles.position}>
              {index + 1}º
            </AppText>
            <Avatar kind={row.avatarKind} value={row.avatarValue} size={36} />
            <View style={styles.flex}>
              <AppText variant="bodyStrong" numberOfLines={1}>
                {row.name}
              </AppText>
              <AppText variant="caption" color={row.bingo || row.line ? colors.primaryText : colors.textSecondary}>
                {status}
              </AppText>
            </View>
            <AppText variant="heading" color={row.points > 0 ? colors.success : colors.textTertiary}>
              {row.points > 0 ? `+${row.points}` : '0'}
            </AppText>
          </View>
        );
      })}
    </View>
  );
}
export const BingoRanking = memo(BingoRankingBase);

const styles = StyleSheet.create({
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, justifyContent: 'space-between' },
  cell: {
    width: '31.5%',
    aspectRatio: 1,
    borderRadius: radius.md,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    padding: spacing.xs,
  },
  center: { textAlign: 'center' },
  list: { gap: spacing.xs + 2 },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm + 2, padding: spacing.sm + 2, borderRadius: radius.md },
  position: { minWidth: 34 },
  flex: { flex: 1 },
});
