import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { useCallback, useEffect, useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { AppText } from '@/components/ui';
import { useBroadcast } from '@/hooks/useBroadcast';
import { speak, vibrate } from '@/services/device/feedback';
import { driverColors, fonts, radius, spacing } from '@/theme';

const SHOW_MS = 10_000;

/**
 * Aviso a pantalla completa en el Modo conductor cuando alguien pide parada (S2-04): se ve en
 * grande 10 segundos y se lee en voz alta. Si llegan varios, van uno detrás de otro.
 */
export function StopBanner() {
  const [queue, setQueue] = useState<string[]>([]);
  const current = queue[0] ?? null;
  const spokenRef = useRef<string | null>(null);

  useBroadcast(
    'pedir_parada',
    useCallback((event) => setQueue((list) => [...list, event.name]), []),
  );

  useEffect(() => {
    if (current === null) return;
    const key = `${current}-${queue.length}`;
    if (spokenRef.current !== key) {
      spokenRef.current = key;
      vibrate('warning');
      speak(`${current} pide parada`);
    }
    const timer = setTimeout(() => setQueue((list) => list.slice(1)), SHOW_MS);
    return () => clearTimeout(timer);
  }, [current, queue.length]);

  if (current === null) return null;
  return (
    <View style={styles.overlay} accessibilityLiveRegion="assertive" accessibilityRole="alert">
      <View style={styles.banner}>
        <MaterialCommunityIcons name="hand-back-right" size={64} color={driverColors.background} />
        <AppText style={styles.name} color={driverColors.background} numberOfLines={2}>
          {current}
        </AppText>
        <AppText style={styles.text} color={driverColors.background}>
          pide parada
        </AppText>
        {queue.length > 1 ? (
          <AppText variant="bodyStrong" color={driverColors.background}>
            y {queue.length - 1} más
          </AppText>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: { ...StyleSheet.absoluteFill, zIndex: 30, justifyContent: 'center', padding: spacing.lg, backgroundColor: driverColors.background },
  banner: {
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.xxl,
    paddingHorizontal: spacing.lg,
    borderRadius: radius.lg,
    backgroundColor: driverColors.accent,
  },
  name: { fontFamily: fonts.black, fontSize: 56, lineHeight: 60, letterSpacing: -1.5, textAlign: 'center' },
  text: { fontFamily: fonts.display, fontSize: 32, lineHeight: 36 },
});
