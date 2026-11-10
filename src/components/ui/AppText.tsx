import { memo } from 'react';
import { StyleSheet, Text, type TextProps } from 'react-native';

import { colors, typography, type TypographyVariant } from '@/theme';

type Props = TextProps & {
  variant?: TypographyVariant;
  color?: string;
};

/** Texto con la tipografía de COPI. Respeta el tamaño de texto del sistema (texto dinámico). */
function AppTextBase({ variant = 'body', color = colors.text, style, ...rest }: Props) {
  return (
    <Text
      maxFontSizeMultiplier={1.6}
      {...rest}
      style={[styles[variant], { color }, style]}
    />
  );
}

const styles = StyleSheet.create(typography);

export const AppText = memo(AppTextBase);
