import { memo } from 'react';
import { StyleSheet, TextInput, View, type TextInputProps } from 'react-native';

import { colors, radius, spacing, typography } from '@/theme';

import { AppText } from './AppText';

type Props = Omit<TextInputProps, 'style'> & {
  label: string;
  error?: string | undefined;
  hint?: string;
};

/** Campo de texto con etiqueta, pista y error debajo. */
function TextFieldBase({ label, error, hint, ...rest }: Props) {
  return (
    <View style={styles.wrapper}>
      <AppText variant="caption" color={colors.textSecondary}>
        {label}
      </AppText>
      <TextInput
        accessibilityLabel={label}
        accessibilityHint={error ?? hint}
        placeholderTextColor={colors.textSecondary}
        maxFontSizeMultiplier={1.6}
        style={[styles.input, error !== undefined && styles.inputError]}
        {...rest}
      />
      {error !== undefined ? (
        <AppText variant="caption" color={colors.danger}>
          {error}
        </AppText>
      ) : hint !== undefined ? (
        <AppText variant="caption" color={colors.textSecondary}>
          {hint}
        </AppText>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { gap: spacing.xs },
  input: {
    ...typography.body,
    color: colors.text,
    backgroundColor: colors.surface,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 4,
    minHeight: 48,
  },
  inputError: { borderColor: colors.danger },
});

export const TextField = memo(TextFieldBase);
