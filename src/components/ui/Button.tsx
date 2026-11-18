import Ionicons from '@expo/vector-icons/Ionicons';
import { memo } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, View, type PressableProps } from 'react-native';

import { driverColors, radius, spacing, useTheme, type Palette } from '@/theme';

import { AppText } from './AppText';
import type { IconName } from './TabIcon';

type Variant = 'primary' | 'secondary' | 'inverse' | 'ghost' | 'danger' | 'driver';
type Size = 'md' | 'lg';

type Props = Omit<PressableProps, 'children' | 'style'> & {
  label: string;
  variant?: Variant;
  size?: Size;
  icon?: IconName;
  loading?: boolean;
  /** Ocupa todo el ancho (por defecto). Con false se ajusta al texto. */
  block?: boolean;
};

function paletteFor(variant: Variant, c: Palette) {
  switch (variant) {
    case 'primary':
      return { background: c.primary, pressed: c.primaryPressed, text: c.textOnPrimary, border: c.primary };
    case 'secondary':
      return { background: c.surfaceStrong, pressed: c.border, text: c.text, border: c.surfaceStrong };
    case 'inverse':
      return { background: c.inverse, pressed: c.inverseSoft, text: c.textOnInverse, border: c.inverse };
    case 'ghost':
      return { background: 'transparent', pressed: c.surface, text: c.primaryText, border: 'transparent' };
    case 'danger':
      return { background: 'transparent', pressed: c.dangerSoft, text: c.danger, border: c.border };
    case 'driver':
      return {
        background: driverColors.surfaceStrong,
        pressed: driverColors.surface,
        text: driverColors.text,
        border: driverColors.surfaceStrong,
      };
  }
}

function ButtonBase({ label, variant = 'primary', size = 'md', icon, loading = false, block = true, disabled, ...rest }: Props) {
  const { colors } = useTheme();
  const palette = paletteFor(variant, colors);
  const isDisabled = disabled === true || loading;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: isDisabled, busy: loading }}
      disabled={isDisabled}
      style={({ pressed }) => [
        styles.base,
        size === 'lg' && styles.large,
        !block && styles.inline,
        { backgroundColor: pressed ? palette.pressed : palette.background, borderColor: palette.border },
        pressed && styles.pressed,
        isDisabled && styles.disabled,
      ]}
      {...rest}
    >
      {loading ? (
        <ActivityIndicator color={palette.text} />
      ) : (
        <View style={styles.content}>
          {icon ? <Ionicons name={icon} size={size === 'lg' ? 22 : 19} color={palette.text} /> : null}
          <AppText variant={size === 'lg' ? 'heading' : 'bodyStrong'} color={palette.text} numberOfLines={1}>
            {label}
          </AppText>
        </View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    minHeight: 52,
    borderRadius: radius.sm + 4,
    borderWidth: 1,
    paddingHorizontal: spacing.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  large: { minHeight: 60, borderRadius: radius.md },
  inline: { alignSelf: 'flex-start' },
  content: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  pressed: { transform: [{ scale: 0.985 }] },
  disabled: { opacity: 0.4 },
});

export const Button = memo(ButtonBase);
