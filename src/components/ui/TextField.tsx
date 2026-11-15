import { memo, useState } from 'react';
import { StyleSheet, TextInput, View, type TextInputProps } from 'react-native';

import { radius, spacing, typography, useTheme } from '@/theme';

import { AppText } from './AppText';

type Props = Omit<TextInputProps, 'style'> & {
  label: string;
  error?: string | undefined;
  hint?: string | undefined;
};

/** Campo de texto con etiqueta, pista y error debajo. El borde se pone naranja al escribir. */
function TextFieldBase({ label, error, hint, onFocus, onBlur, ...rest }: Props) {
  const { colors, scheme } = useTheme();
  const [focused, setFocused] = useState(false);
  const borderColor = error !== undefined ? colors.danger : focused ? colors.primary : colors.border;

  return (
    <View style={styles.wrapper}>
      <AppText variant="label" color={colors.textSecondary}>
        {label}
      </AppText>
      <TextInput
        accessibilityLabel={label}
        accessibilityHint={error ?? hint}
        placeholderTextColor={colors.textTertiary}
        maxFontSizeMultiplier={1.6}
        selectionColor={colors.primary}
        cursorColor={colors.primary}
        keyboardAppearance={scheme}
        onFocus={(event) => {
          setFocused(true);
          onFocus?.(event);
        }}
        onBlur={(event) => {
          setFocused(false);
          onBlur?.(event);
        }}
        style={[styles.input, { color: colors.text, backgroundColor: colors.background, borderColor }]}
        {...rest}
      />
      {error !== undefined ? (
        <AppText variant="caption" color={colors.danger}>
          {error}
        </AppText>
      ) : hint !== undefined ? (
        <AppText variant="caption" color={colors.textTertiary}>
          {hint}
        </AppText>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { gap: spacing.xs + 2 },
  input: {
    ...typography.bodyStrong,
    borderRadius: radius.sm,
    borderWidth: 1.5,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 4,
    minHeight: 54,
  },
});

export const TextField = memo(TextFieldBase);
