import { memo } from 'react';
import { StyleSheet, View } from 'react-native';

import { fonts, radius, spacing, useStyles, useTheme, type Palette } from '@/theme';

import { AppText } from './AppText';
import { IconTile, type MciName, type Tint } from './IconTile';

type Props = {
  icon: MciName;
  value: string;
  label: string;
  tint?: Tint;
  /** `lg` para la cifra principal de una sección. */
  size?: 'md' | 'lg';
};

/**
 * Estadística en tarjeta: icono de color, cifra protagonista y etiqueta. Pensada para rejillas de
 * dos columnas (`flexBasis: 47%`), con la cifra en una línea que se encoge si no cabe.
 */
function StatTileBase({ icon, value, label, tint = 'primary', size = 'md' }: Props) {
  const { colors } = useTheme();
  const styles = useStyles(makeStyles);
  return (
    <View style={styles.tile} accessible accessibilityLabel={`${label}: ${value}`}>
      <IconTile icon={icon} tint={tint} size={size === 'lg' ? 40 : 34} />
      <AppText style={[styles.value, size === 'lg' && styles.valueLg]} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.6}>
        {value}
      </AppText>
      <AppText variant="caption" color={colors.textSecondary} numberOfLines={2}>
        {label}
      </AppText>
    </View>
  );
}

export const StatTile = memo(StatTileBase);

const makeStyles = (c: Palette) =>
  StyleSheet.create({
    tile: {
      flexBasis: '46%',
      flexGrow: 1,
      minWidth: 140,
      gap: spacing.xs + 2,
      padding: spacing.md,
      borderRadius: radius.md,
      backgroundColor: c.surface,
      borderWidth: 1,
      borderColor: c.border,
    },
    value: { fontFamily: fonts.black, fontSize: 24, lineHeight: 29, letterSpacing: -0.8, color: c.text, marginTop: spacing.xs },
    valueLg: { fontSize: 30, lineHeight: 35 },
  });
