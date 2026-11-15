import { StyleSheet, View } from 'react-native';

import { radius, spacing, useTheme } from '@/theme';

import { AppText } from './AppText';

type Props = {
  steps: readonly string[];
  /** Índice del paso actual (desde 0). */
  current: number;
};

/** Progreso de un proceso por pasos (la entrada al coche). */
export function StepIndicator({ steps, current }: Props) {
  const { colors } = useTheme();
  return (
    <View
      style={styles.wrapper}
      accessibilityRole="progressbar"
      accessibilityLabel={`Paso ${current + 1} de ${steps.length}: ${steps[current] ?? ''}`}
    >
      <View style={styles.bars}>
        {steps.map((step, index) => (
          <View
            key={step}
            style={[styles.bar, { backgroundColor: index <= current ? colors.primary : colors.surfaceStrong }]}
          />
        ))}
      </View>
      <AppText variant="label" color={colors.textSecondary}>
        {current + 1}/{steps.length}  {steps[current]}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { gap: spacing.sm },
  bars: { flexDirection: 'row', gap: 6 },
  bar: { flex: 1, height: 5, borderRadius: radius.pill },
});
