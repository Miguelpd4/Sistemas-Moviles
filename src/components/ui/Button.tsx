import { memo } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, type PressableProps } from 'react-native';

import { colors, radius, spacing } from '@/theme';

import { AppText } from './AppText';

type Variant = 'primary' | 'secondary' | 'inverse';

type Props = Omit<PressableProps, 'children' | 'style'> & {
  label: string;
  variant?: Variant;
  loading?: boolean;
};

const variantStyles = {
  primary: { background: colors.primary, text: colors.textOnPrimary },
  secondary: { background: colors.surface, text: colors.text },
  inverse: { background: colors.inverse, text: colors.textOnInverse },
} as const satisfies Record<Variant, { background: string; text: string }>;

function ButtonBase({ label, variant = 'primary', loading = false, disabled, ...rest }: Props) {
  const palette = variantStyles[variant];
  const isDisabled = disabled === true || loading;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: isDisabled, busy: loading }}
      disabled={isDisabled}
      style={({ pressed }) => [
        styles.base,
        { backgroundColor: palette.background },
        pressed && styles.pressed,
        isDisabled && styles.disabled,
      ]}
      {...rest}
    >
      {loading ? (
        <ActivityIndicator color={palette.text} />
      ) : (
        <AppText variant="heading" color={palette.text}>
          {label}
        </AppText>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    minHeight: 56,
    borderRadius: radius.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pressed: { opacity: 0.85, transform: [{ scale: 0.98 }] },
  disabled: { opacity: 0.5 },
});

export const Button = memo(ButtonBase);
