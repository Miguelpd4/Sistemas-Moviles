import { memo } from 'react';
import Svg, { Circle, Ellipse, Path } from 'react-native-svg';

import { isLightPaint, paintHex } from '@/lib/carColors';
import { carDrawing } from '@/theme';

type Props = {
  color: string | null | undefined;
  /** Ancho en píxeles; el alto sale de la proporción del dibujo. */
  width: number;
};

const VIEW_W = 240;
const VIEW_H = 104;

/**
 * Silueta lateral de un turismo pintada del color del coche. Se usa cuando no hay foto propia
 * ni foto del modelo.
 */
function CarSilhouetteBase({ color, width }: Props) {
  const paint = paintHex(color);
  const light = isLightPaint(color);
  const outline = light ? carDrawing.outline : 'transparent';
  const glass = light ? carDrawing.glassOnLight : carDrawing.glassOnDark;
  const trim = light ? carDrawing.trimOnLight : carDrawing.trimOnDark;

  return (
    <Svg width={width} height={(width * VIEW_H) / VIEW_W} viewBox={`0 0 ${VIEW_W} ${VIEW_H}`}>
      {/* Sombra en el suelo */}
      <Ellipse cx={120} cy={92} rx={104} ry={6} fill={carDrawing.groundShadow} opacity={0.28} />
      {/* Carrocería */}
      <Path
        d="M16 74 L16 60 Q17 50 32 47 L72 42 L98 22 Q104 17 114 17 L162 17 Q174 17 184 26 L204 43 L220 47 Q230 50 230 61 L230 74 Q230 78 226 78 L20 78 Q16 78 16 74 Z"
        fill={paint}
        stroke={outline}
        strokeWidth={1.5}
      />
      {/* Ventanillas */}
      <Path d="M104 25 Q108 22 115 22 L140 22 L140 42 L84 42 Z" fill={glass} opacity={0.9} />
      <Path d="M146 22 L160 22 Q170 22 177 29 L192 42 L146 42 Z" fill={glass} opacity={0.9} />
      {/* Línea de puertas y faros */}
      <Path d="M143 44 L143 72" stroke={trim} strokeWidth={1.2} opacity={0.5} />
      <Path d="M220 52 L228 54" stroke={carDrawing.headlight} strokeWidth={4} strokeLinecap="round" />
      <Path d="M18 56 L24 55" stroke={carDrawing.taillight} strokeWidth={4} strokeLinecap="round" />
      {/* Ruedas */}
      <Circle cx={64} cy={78} r={15} fill={carDrawing.tyre} />
      <Circle cx={64} cy={78} r={7} fill={carDrawing.hub} />
      <Circle cx={186} cy={78} r={15} fill={carDrawing.tyre} />
      <Circle cx={186} cy={78} r={7} fill={carDrawing.hub} />
    </Svg>
  );
}

export const CarSilhouette = memo(CarSilhouetteBase);
