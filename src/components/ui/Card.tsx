import type { ReactNode } from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { radius, spacing, useStyles, useTheme, type Palette } from '@/theme';

type Tone = 'default' | 'raised' | 'outline' | 'inverse' | 'accent';

type Props = {
  children: ReactNode;
  /**
   * default: superficie sobre el fondo.
   * raised: lo principal de la pantalla (con borde y sombra).
   * outline: transparente con borde (listas y ajustes).
   * inverse: en el color contrario al tema.
   * accent: naranja.
   */
  tone?: Tone;
  style?: StyleProp<ViewStyle>;
};

export function Card({ children, tone = 'default', style }: Props) {
  const styles = useStyles(makeStyles);
  const { elevation } = useTheme();
  return <View style={[styles.base, styles[tone], tone === 'raised' && elevation, style]}>{children}</View>;
}

const makeStyles = (c: Palette) =>
  StyleSheet.create({
    base: { borderRadius: radius.lg, padding: spacing.lg - 4, gap: spacing.md },
    default: { backgroundColor: c.surface },
    raised: { backgroundColor: c.surfaceRaised, borderWidth: 1, borderColor: c.border },
    outline: { backgroundColor: 'transparent', borderWidth: 1, borderColor: c.border },
    inverse: { backgroundColor: c.inverse },
    accent: { backgroundColor: c.primary },
  });
