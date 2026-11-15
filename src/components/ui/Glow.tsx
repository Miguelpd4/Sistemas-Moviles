import { memo, useId } from 'react';
import { StyleSheet, View } from 'react-native';
import Svg, { Defs, RadialGradient, Rect, Stop } from 'react-native-svg';

import { useTheme } from '@/theme';

type Props = {
  /** Color del resplandor; por defecto el del tema. */
  color?: string;
  /** Dónde está el centro, en fracciones (0–1) del ancho y del alto. */
  cx?: number;
  cy?: number;
};

/** Resplandor suave detrás del coche, como los faros reflejados en el suelo de noche. */
function GlowBase({ color, cx = 0.5, cy = 1, }: Props) {
  const { colors } = useTheme();
  const id = useId().replace(/:/g, '');
  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      <Svg width="100%" height="100%">
        <Defs>
          <RadialGradient id={id} cx={`${cx * 100}%`} cy={`${cy * 100}%`} rx="75%" ry="80%">
            <Stop offset="0" stopColor={color ?? colors.glow} stopOpacity={1} />
            <Stop offset="1" stopColor={color ?? colors.glow} stopOpacity={0} />
          </RadialGradient>
        </Defs>
        <Rect x="0" y="0" width="100%" height="100%" fill={`url(#${id})`} />
      </Svg>
    </View>
  );
}

export const Glow = memo(GlowBase);
