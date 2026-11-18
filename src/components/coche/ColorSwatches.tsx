import Ionicons from '@expo/vector-icons/Ionicons';
import { Pressable, StyleSheet, View } from 'react-native';

import { AppText } from '@/components/ui';
import { CAR_COLORS, colorLabel, isLightPaint, type CarColor } from '@/lib/carColors';
import { carDrawing, radius, spacing, useTheme } from '@/theme';

type Props = {
  value: CarColor | null;
  onChange: (color: CarColor | null) => void;
};

/** Colores de carrocería. Tocar el elegido lo quita. */
export function ColorSwatches({ value, onChange }: Props) {
  const { colors } = useTheme();
  return (
    <View style={styles.wrapper}>
      <View style={styles.row} accessibilityRole="radiogroup" accessibilityLabel="Color del coche">
        {CAR_COLORS.map((color) => {
          const selected = value === color.value;
          const light = isLightPaint(color.value);
          return (
            <Pressable
              key={color.value}
              accessibilityRole="radio"
              accessibilityLabel={color.label}
              accessibilityState={{ checked: selected }}
              onPress={() => onChange(selected ? null : color.value)}
              style={[styles.ring, { borderColor: selected ? colors.primary : 'transparent' }]}
              hitSlop={4}
            >
              <View
                style={[
                  styles.swatch,
                  { backgroundColor: color.hex, borderColor: light ? carDrawing.outline : colors.borderStrong },
                ]}
              >
                {selected ? <Ionicons name="checkmark" size={20} color={light ? carDrawing.tyre : colors.textOnPrimary} /> : null}
              </View>
            </Pressable>
          );
        })}
      </View>
      <AppText variant="caption" color={colors.textSecondary}>
        {value ? `Color: ${colorLabel(value) ?? ''}` : 'Sin color elegido'}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { gap: spacing.sm },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  ring: { padding: 3, borderRadius: radius.pill, borderWidth: 2.5 },
  swatch: { width: 38, height: 38, borderRadius: radius.pill, alignItems: 'center', justifyContent: 'center', borderWidth: 1 },
});
