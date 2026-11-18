import { memo } from 'react';
import { StyleSheet, Text, type TextProps } from 'react-native';

import { typography, useTheme, type TypographyVariant } from '@/theme';

type Props = TextProps & {
  variant?: TypographyVariant;
  color?: string;
};

/** Texto con la tipografía de COPI (Inter). Respeta el tamaño de texto del sistema (texto dinámico). */
function AppTextBase({ variant = 'body', color, style, ...rest }: Props) {
  const { colors } = useTheme();
  return <Text maxFontSizeMultiplier={1.6} {...rest} style={[styles[variant], { color: color ?? colors.text }, style]} />;
}

const styles = StyleSheet.create(typography);

export const AppText = memo(AppTextBase);
