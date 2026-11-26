import { useEffect } from 'react';
import { StyleSheet, View, type DimensionValue, type StyleProp, type ViewStyle } from 'react-native';
import Animated, { useAnimatedStyle, useReducedMotion, useSharedValue, withRepeat, withTiming } from 'react-native-reanimated';

import { radius, spacing, useTheme } from '@/theme';

type Props = { width?: DimensionValue; height: number; rounded?: number; style?: StyleProp<ViewStyle> };

/** Bloque de carga que late suavemente (quieto si el sistema pide reducir el movimiento). */
export function Skeleton({ width = '100%', height, rounded = radius.sm, style }: Props) {
  const { colors } = useTheme();
  const reduceMotion = useReducedMotion();
  const opacity = useSharedValue(0.55);
  useEffect(() => {
    if (!reduceMotion) opacity.set(withRepeat(withTiming(1, { duration: 750 }), -1, true));
  }, [opacity, reduceMotion]);
  const animated = useAnimatedStyle(() => ({ opacity: opacity.get() }));
  return <Animated.View style={[{ width, height, borderRadius: rounded, backgroundColor: colors.surfaceStrong }, animated, style]} />;
}

/** Tarjetas de carga para listas (historial, cuentas, cola…). */
export function SkeletonCards({ count = 3, height = 96 }: { count?: number; height?: number }) {
  const { colors } = useTheme();
  return (
    <View style={styles.list} accessibilityLabel="Cargando" accessibilityRole="progressbar">
      {Array.from({ length: count }, (_, i) => (
        <View key={i} style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Skeleton width={44} height={44} rounded={14} />
          <View style={styles.lines}>
            <Skeleton width="60%" height={14} />
            <Skeleton width="85%" height={12} />
            {height > 80 ? <Skeleton width="40%" height={12} /> : null}
          </View>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  list: { gap: spacing.sm + 4 },
  card: { flexDirection: 'row', gap: spacing.md, padding: spacing.md, borderRadius: radius.lg, borderWidth: 1 },
  lines: { flex: 1, gap: spacing.sm, justifyContent: 'center' },
});
