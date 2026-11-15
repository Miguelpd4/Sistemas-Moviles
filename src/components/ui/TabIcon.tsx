import Ionicons from '@expo/vector-icons/Ionicons';
import type { ComponentProps } from 'react';
import type { ColorValue } from 'react-native';

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

export function TabIcon({ name, outline, color, size, focused = false }: Props) {
  return <Ionicons name={focused || outline === undefined ? name : outline} color={toIconColor(color)} size={size} />;
}
