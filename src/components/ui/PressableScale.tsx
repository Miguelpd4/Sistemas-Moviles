import { useState, type ReactNode } from 'react';
import { Pressable, type GestureResponderEvent, type PressableProps, type StyleProp, type ViewStyle } from 'react-native';
import Animated, { useAnimatedStyle, useReducedMotion, useSharedValue, withSpring } from 'react-native-reanimated';

import { vibrate } from '@/services/device/feedback';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);
const SPRING = { damping: 18, stiffness: 320, mass: 0.6 } as const;

type Props = Omit<PressableProps, 'style' | 'children'> & {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
  /** Estilo mientras se pulsa (por ejemplo, otro fondo). */
  pressedStyle?: StyleProp<ViewStyle>;
  /** Cuánto encoge al pulsar (1 = nada). */
  scaleTo?: number;
  /** Vibración ligera al tocar (solo en el móvil). */
  haptic?: boolean;
};

/**
 * Zona pulsable de COPI: encoge un poco con un muelle al pulsar (sin animación si el sistema pide
 * reducir el movimiento) y puede vibrar suavemente. Base de botones y tarjetas pulsables.
 */
export function PressableScale({ children, style, pressedStyle, scaleTo = 0.97, haptic = false, onPressIn, onPressOut, onPress, ...rest }: Props) {
  const reduceMotion = useReducedMotion();
  const scale = useSharedValue(1);
  const [pressed, setPressed] = useState(false);
  const animated = useAnimatedStyle(() => ({ transform: [{ scale: scale.get() }] }));

  const pressIn = (event: GestureResponderEvent) => {
    setPressed(true);
    if (!reduceMotion) scale.set(withSpring(scaleTo, SPRING));
    onPressIn?.(event);
  };
  const pressOut = (event: GestureResponderEvent) => {
    setPressed(false);
    if (!reduceMotion) scale.set(withSpring(1, SPRING));
    onPressOut?.(event);
  };
  const press = (event: GestureResponderEvent) => {
    if (haptic) vibrate('light');
    onPress?.(event);
  };

  return (
    <AnimatedPressable {...rest} onPressIn={pressIn} onPressOut={pressOut} onPress={press} style={[style, pressed && pressedStyle, animated]}>
      {children}
    </AnimatedPressable>
  );
}
