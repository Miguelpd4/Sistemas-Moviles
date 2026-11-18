import { Pressable, StyleSheet, View } from 'react-native';

import { radius, spacing, useTheme } from '@/theme';

import { AppText } from './AppText';

type Props = {
  label: string;
  description?: string;
  value: boolean;
  onChange: (value: boolean) => void;
  disabled?: boolean;
};

/** Interruptor con etiqueta (grande y fácil de tocar). */
export function Switch({ label, description, value, onChange, disabled = false }: Props) {
  const { colors } = useTheme();
  return (
    <Pressable
      accessibilityRole="switch"
      accessibilityState={{ checked: value, disabled }}
      accessibilityLabel={label}
      disabled={disabled}
      onPress={() => onChange(!value)}
      style={[styles.row, disabled && styles.disabled]}
    >
      <View style={styles.text}>
        <AppText variant="bodyStrong">{label}</AppText>
        {description ? (
          <AppText variant="caption" color={colors.textSecondary}>
            {description}
          </AppText>
        ) : null}
      </View>
      <View style={[styles.track, { backgroundColor: value ? colors.primary : colors.surfaceStrong }]}>
        <View style={[styles.thumb, { backgroundColor: colors.textOnPrimary }, value && styles.thumbOn]} />
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, minHeight: 56 },
  text: { flex: 1, gap: 2 },
  track: { width: 52, height: 32, borderRadius: radius.pill, padding: 3, justifyContent: 'center' },
  thumb: { width: 26, height: 26, borderRadius: 13 },
  thumbOn: { alignSelf: 'flex-end' },
  disabled: { opacity: 0.5 },
});
