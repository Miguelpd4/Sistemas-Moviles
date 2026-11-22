import Ionicons from '@expo/vector-icons/Ionicons';
import { memo, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';

import type { IconName } from '@/components/ui';
import { vibrate } from '@/services/device/feedback';
import { radius, spacing, useTheme } from '@/theme';

type Props = {
  /** Si la canción está sonando (para enseñar pausa o seguir). */
  isPlaying: boolean;
  onRestart: () => void;
  onTogglePlay: (isPlaying: boolean) => void;
  onNext: () => Promise<void>;
};

/**
 * Controles de la música para el conductor y el copiloto (#60): volver al principio, pausar o
 * seguir y pasar a la siguiente. Suenan en el Modo conductor.
 */
function MusicControlsBase({ isPlaying, onRestart, onTogglePlay, onNext }: Props) {
  const { colors } = useTheme();
  const [skipping, setSkipping] = useState(false);

  const next = () => {
    vibrate();
    setSkipping(true);
    void onNext().finally(() => setSkipping(false));
  };

  const button = (icon: IconName, label: string, onPress: () => void, main = false, busy = false) => (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: busy }}
      disabled={busy}
      hitSlop={6}
      onPress={onPress}
      style={({ pressed }) => [
        main ? styles.main : styles.side,
        {
          backgroundColor: main ? (pressed ? colors.primaryPressed : colors.primary) : pressed ? colors.surfaceStrong : colors.surface,
          borderColor: main ? colors.primary : colors.border,
        },
      ]}
    >
      {busy ? (
        <ActivityIndicator color={main ? colors.textOnPrimary : colors.primary} />
      ) : (
        <Ionicons name={icon} size={main ? 30 : 22} color={main ? colors.textOnPrimary : colors.text} />
      )}
    </Pressable>
  );

  return (
    <View style={styles.row}>
      {button('play-skip-back', 'Volver al principio de la canción', () => {
        vibrate();
        onRestart();
      })}
      {button(isPlaying ? 'pause' : 'play', isPlaying ? 'Pausar la música' : 'Seguir con la música', () => {
        vibrate();
        onTogglePlay(isPlaying);
      }, true)}
      {button('play-skip-forward', 'Pasar a la siguiente canción', next, false, skipping)}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.lg },
  side: {
    width: 48,
    height: 48,
    borderRadius: radius.pill,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  main: { width: 64, height: 64, borderRadius: radius.pill, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
});

export const MusicControls = memo(MusicControlsBase);
