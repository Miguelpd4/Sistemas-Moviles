import { useEffect, useState, type ReactNode } from 'react';
import { AccessibilityInfo, Animated, Platform } from 'react-native';

/** Entrada suave (aparece y sube un poco) para cada tarjeta del Wrapped. Sin animación si el móvil pide reducir el movimiento. */
export function Appear({ delay = 0, children }: { delay?: number; children: ReactNode }) {
  const [progress] = useState(() => new Animated.Value(0));
  useEffect(() => {
    let cancelled = false;
    const animation = Animated.timing(progress, { toValue: 1, duration: 450, delay, useNativeDriver: Platform.OS !== 'web' });
    AccessibilityInfo.isReduceMotionEnabled()
      .catch(() => false)
      .then((reduce) => {
        if (cancelled) return;
        if (reduce) progress.setValue(1);
        else animation.start();
      });
    return () => {
      cancelled = true;
      animation.stop();
    };
  }, [progress, delay]);
  const translateY = progress.interpolate({ inputRange: [0, 1], outputRange: [16, 0] });
  return <Animated.View style={{ opacity: progress, transform: [{ translateY }] }}>{children}</Animated.View>;
}
