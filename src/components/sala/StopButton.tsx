import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppText } from '@/components/ui';
import { useNow } from '@/hooks/useNow';
import { useSession } from '@/hooks/useSession';
import { canTrigger, secondsLeft } from '@/lib/cooldown';
import { vibrate } from '@/services/device/feedback';
import { radius, spacing, useTheme } from '@/theme';

const COOLDOWN_MS = 60_000;
/** Alto aproximado de la barra de pestañas. */
const TAB_BAR = 58;

/** Botón fijo «Pedir parada» encima de la barra de pestañas de la sala (S2-04). */
export function StopButton({ onSent }: { onSent: () => void }) {
  const { colors, elevation } = useTheme();
  const insets = useSafeAreaInsets();
  const { send, me, myId } = useSession();
  const [lastAt, setLastAt] = useState<number | null>(null);
  const now = useNow(lastAt === null ? 60_000 : 1000);
  const ready = canTrigger(lastAt, now, COOLDOWN_MS);
  const left = secondsLeft(lastAt, now, COOLDOWN_MS);

  const press = () => {
    if (!ready || myId === null) return;
    vibrate('warning');
    send('pedir_parada', { userId: myId, name: me?.display_name ?? 'Alguien' });
    setLastAt(Date.now());
    onSent();
  };

  return (
    <View pointerEvents="box-none" style={[styles.wrapper, { bottom: insets.bottom + TAB_BAR + spacing.sm }]}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={ready ? 'Pedir parada' : `Parada pedida. Podrás volver a pedirla en ${left} segundos`}
        accessibilityState={{ disabled: !ready }}
        disabled={!ready}
        onPress={press}
        style={({ pressed }) => [
          styles.button,
          { backgroundColor: ready ? colors.inverse : colors.surfaceStrong },
          ready && elevation,
          pressed && styles.pressed,
        ]}
      >
        <MaterialCommunityIcons name="hand-back-right" size={22} color={ready ? colors.primary : colors.textTertiary} />
        <AppText variant="bodyStrong" color={ready ? colors.textOnInverse : colors.textSecondary}>
          {ready ? 'Pedir parada' : `Parada pedida · ${left} s`}
        </AppText>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { position: 'absolute', right: spacing.md, alignItems: 'flex-end' },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    minHeight: 52,
    paddingHorizontal: spacing.md + 4,
    borderRadius: radius.pill,
  },
  pressed: { transform: [{ scale: 0.97 }] },
});
