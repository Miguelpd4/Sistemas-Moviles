import Ionicons from '@expo/vector-icons/Ionicons';
import type { ComponentProps } from 'react';
import { StyleSheet, View, type ColorValue } from 'react-native';

import { radius, useTheme } from '@/theme';

export type IconName = ComponentProps<typeof Ionicons>['name'];

type Props = {
  /** Icono relleno (pestaña activa). */
  name: IconName;
  /** Icono de contorno (pestaña inactiva). Si no se da, se usa `name`. */
  outline?: IconName;
  color: ColorValue;
  size: number;
  focused?: boolean;
};

// La barra de pestañas siempre pasa colores en texto; null no llega nunca.
const toIconColor = (color: ColorValue): string | undefined => (typeof color === 'string' ? color : undefined);

/** Icono de la barra inferior: la pestaña activa va dentro de una pastilla del color de acción. */
export function TabIcon({ name, outline, color, size, focused = false }: Props) {
  const { colors } = useTheme();
  return (
    <View style={[styles.pill, focused && { backgroundColor: colors.primarySoft }]}>
      <Ionicons name={focused || outline === undefined ? name : outline} color={toIconColor(color)} size={size - 2} />
    </View>
  );
}

const styles = StyleSheet.create({
  pill: { width: 52, height: 30, borderRadius: radius.pill, alignItems: 'center', justifyContent: 'center' },
});
