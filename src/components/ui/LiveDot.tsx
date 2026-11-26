import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { useAnimatedStyle, useReducedMotion, useSharedValue, withRepeat, withTiming } from 'react-native-reanimated';

import { useTheme } from '@/theme';

/** Punto «en directo» con un anillo que se expande (quieto si el sistema pide reducir el movimiento). */
export function LiveDot({ color, size = 10 }: { color?: string; size?: number }) {
  const { colors } = useTheme();
  const tint = color ?? colors.success;
  const reduceMotion = useReducedMotion();
  const progress = useSharedValue(0);
  useEffect(() => {
    if (!reduceMotion) progress.set(withRepeat(withTiming(1, { duration: 1400 }), -1, false));
  }, [progress, reduceMotion]);
  const ring = useAnimatedStyle(() => ({ opacity: 0.55 * (1 - progress.get()), transform: [{ scale: 1 + progress.get() * 1.6 }] }));
  return (
    <View style={[styles.box, { width: size * 2.4, height: size * 2.4 }]} importantForAccessibility="no-hide-descendants">
      <Animated.View style={[{ position: 'absolute', width: size, height: size, borderRadius: size, backgroundColor: tint }, ring]} />
      <View style={{ width: size, height: size, borderRadius: size, backgroundColor: tint }} />
    </View>
  );
}

const styles = StyleSheet.create({ box: { alignItems: 'center', justifyContent: 'center' } });
