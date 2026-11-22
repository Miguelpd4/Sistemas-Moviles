import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import type { RefObject } from 'react';
import { Platform, StyleSheet, View } from 'react-native';

import { YouTubePlayer, type YouTubePlayerHandle } from '@/components/musica/YouTubePlayer';
import { AppText } from '@/components/ui';
import type { PlayerState } from '@/lib/queue';
import { driverColors, radius, spacing } from '@/theme';
import type { YouTubePlayerEvent } from '@/types/youtube';

type Props = {
  /** `playerRef` y `onEvent` de useYouTubeController. */
  playerRef: RefObject<YouTubePlayerHandle | null>;
  onEvent: (event: YouTubePlayerEvent) => void;
  state: PlayerState;
  /** Error del reproductor (vídeo que no deja reproducirse, etc.). */
  playerError: string | null;
  /** Hay una canción sonando según la cola. */
  hasSong: boolean;
  /** Error al avanzar la cola (Supabase). */
  queueError: string | null;
};

/**
 * Música en el Modo conductor (#57): el reproductor de YouTube con la cola de la sala. Suena aquí
 * mismo, sin cuentas ni otras apps. YouTube exige que el vídeo se vea: no se puede ocultar.
 */
export function MusicPlayer({ playerRef, onEvent, state, playerError, hasSong, queueError }: Props) {
  // En el navegador, la música no puede empezar sola si no se ha tocado la página.
  const blocked = Platform.OS === 'web' && hasSong && (state === 'unstarted' || state === 'cued');
  return (
    <View style={styles.box}>
      <View style={styles.row}>
        <MaterialCommunityIcons name="youtube" size={30} color={driverColors.accent} />
        <View style={styles.text}>
          <AppText variant="heading" color={driverColors.text}>
            Música de la sala
          </AppText>
          <AppText variant="caption" color={driverColors.textSecondary}>
            {hasSong ? 'Suena aquí la cola que eligen los pasajeros.' : 'Los pasajeros añaden canciones desde Música en su móvil.'}
          </AppText>
        </View>
      </View>
      <YouTubePlayer ref={playerRef} onEvent={onEvent} style={styles.player} />
      {blocked ? (
        <AppText variant="bodyStrong" color={driverColors.accent}>
          Si no suena, pulsa ▶ en el vídeo: el navegador no deja que la música empiece sola.
        </AppText>
      ) : null}
      {playerError ? (
        <AppText variant="bodyStrong" color={driverColors.accent}>
          {playerError} Pasamos a la siguiente.
        </AppText>
      ) : null}
      {queueError ? (
        <AppText variant="bodyStrong" color={driverColors.accent}>
          {queueError}
        </AppText>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  box: { backgroundColor: driverColors.surface, borderRadius: radius.md, padding: spacing.md, gap: spacing.sm + 2 },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  text: { flex: 1, gap: 2 },
  // YouTube pide que el reproductor se vea y mida al menos 200 × 200 px: 356 × 200 (16:9), sin ocupar toda la pantalla.
  player: { width: '100%', maxWidth: 356, height: 200, aspectRatio: undefined, alignSelf: 'center', borderRadius: radius.sm },
});
