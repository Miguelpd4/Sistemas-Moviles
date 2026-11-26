import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { memo, type ComponentProps } from 'react';
import { StyleSheet, View } from 'react-native';

import { radius, useTheme, type AccentName } from '@/theme';

export type MciName = ComponentProps<typeof MaterialCommunityIcons>['name'];
/** `primary` es el naranja de COPI; el resto, los acentos secundarios. */
export type Tint = 'primary' | AccentName;

type Props = {
  icon: MciName;
  tint?: Tint;
  size?: number;
  /** Relleno de color (icono blanco) en vez de fondo suave. */
  solid?: boolean;
};

/** Icono dentro de un cuadrado redondeado de color: identifica secciones, juegos y estadísticas. */
function IconTileBase({ icon, tint = 'primary', size = 44, solid = false }: Props) {
  const { colors } = useTheme();
  const accent = tint === 'primary' ? { solid: colors.primary, soft: colors.primarySoft, text: colors.primaryText } : colors.accents[tint];
  return (
    <View
      style={[styles.tile, { width: size, height: size, borderRadius: Math.round(size * 0.32), backgroundColor: solid ? accent.solid : accent.soft }]}
      importantForAccessibility="no-hide-descendants"
      accessibilityElementsHidden
    >
      <MaterialCommunityIcons name={icon} size={Math.round(size * 0.52)} color={solid ? colors.textOnPrimary : accent.text} />
    </View>
  );
}

export const IconTile = memo(IconTileBase);

const styles = StyleSheet.create({ tile: { alignItems: 'center', justifyContent: 'center', borderRadius: radius.sm } });
