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
      // Como un reproductor de música: ⏮ y ⏭ solo con el icono; ⏸/▶ en un círculo del color del texto.
      style={({ pressed }) => [
        main ? styles.main : styles.side,
        main ? { backgroundColor: colors.text } : null,
        pressed ? styles.pressed : null,
      ]}
    >
      {busy ? (
        <ActivityIndicator color={main ? colors.background : colors.textSecondary} />
      ) : (
        <Ionicons
          name={icon}
          size={main ? 28 : 30}
          color={main ? colors.background : colors.textTertiary}
          // El triángulo de ▶ se ve descentrado: un poco a la derecha.
          style={main && icon === 'play' ? styles.playNudge : undefined}
        />
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
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.xl },
  side: { width: 48, height: 48, alignItems: 'center', justifyContent: 'center' },
  main: { width: 56, height: 56, borderRadius: radius.pill, alignItems: 'center', justifyContent: 'center' },
  pressed: { opacity: 0.6 },
  playNudge: { marginLeft: 3 },
});

export const MusicControls = memo(MusicControlsBase);
