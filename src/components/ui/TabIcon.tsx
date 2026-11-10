import Ionicons from '@expo/vector-icons/Ionicons';
import type { ComponentProps } from 'react';
import type { ColorValue } from 'react-native';

export type IconName = ComponentProps<typeof Ionicons>['name'];

type Props = { name: IconName; color: ColorValue; size: number };

// La barra de pestañas siempre pasa colores en texto (ver tabBarOptions); null no llega nunca.
const toIconColor = (color: ColorValue): string | undefined =>
  typeof color === 'string' ? color : undefined;

export function TabIcon({ name, color, size }: Props) {
  return <Ionicons name={name} color={toIconColor(color)} size={size} />;
}
