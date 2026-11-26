import Ionicons from '@expo/vector-icons/Ionicons';
import { router } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { AlbumArt } from '@/components/musica/AlbumArt';
import { AppText, IconTile, PressableScale } from '@/components/ui';
import { useQueue } from '@/hooks/useQueue';
import { useSession } from '@/hooks/useSession';
import { radius, spacing, useStyles, useTheme, type Palette } from '@/theme';

/**
 * La sala de un vistazo: lo que suena ahora (lleva a Música) y adónde vais (lleva a Viaje, con la
 * ruta y la hora de llegada).
 */
export function RoomShortcuts() {
  const { colors } = useTheme();
  const styles = useStyles(makeStyles);
  const { sessionId, session } = useSession();
  const { nowPlaying, upcoming } = useQueue();
  const destination = session?.destination?.name ?? null;

  return (
    <View style={styles.row}>
      <PressableScale
        accessibilityRole="button"
        accessibilityLabel={nowPlaying ? `Ahora suena ${nowPlaying.title}, de ${nowPlaying.artist}. Abrir Música` : 'No suena nada. Abrir Música'}
        onPress={() => router.navigate(`/sala/${sessionId}/musica`)}
        style={styles.card}
        pressedStyle={{ backgroundColor: colors.surfaceStrong }}
      >
        <View style={styles.top}>
          {nowPlaying ? <AlbumArt url={nowPlaying.album_art_url} size={42} /> : <IconTile icon="music-note" tint="pink" size={42} />}
          <Ionicons name="arrow-forward" size={16} color={colors.textTertiary} />
        </View>
        <AppText variant="overline" color={colors.accents.pink.text}>
          {nowPlaying ? 'Ahora suena' : 'Música'}
        </AppText>
        <AppText variant="bodyStrong" numberOfLines={1}>
          {nowPlaying ? nowPlaying.title : 'Nada en la cola'}
        </AppText>
        <AppText variant="caption" color={colors.textSecondary} numberOfLines={1}>
          {nowPlaying ? `${nowPlaying.artist} · ${upcoming.length} en cola` : 'Añade la primera canción'}
        </AppText>
      </PressableScale>

      <PressableScale
        accessibilityRole="button"
        accessibilityLabel={destination ? `Destino: ${destination}. Ver ruta y llegada` : 'Sin destino todavía. Abrir Viaje'}
        onPress={() => router.navigate(`/sala/${sessionId}/viaje`)}
        style={styles.card}
        pressedStyle={{ backgroundColor: colors.surfaceStrong }}
      >
        <View style={styles.top}>
          <IconTile icon="flag-checkered" tint="blue" size={42} />
          <Ionicons name="arrow-forward" size={16} color={colors.textTertiary} />
        </View>
        <AppText variant="overline" color={colors.accents.blue.text}>
          Destino
        </AppText>
        <AppText variant="bodyStrong" numberOfLines={1}>
          {destination ?? 'Sin destino'}
        </AppText>
        <AppText variant="caption" color={colors.textSecondary} numberOfLines={1}>
          {destination ? 'Ruta y hora de llegada' : 'El copiloto puede ponerlo'}
        </AppText>
      </PressableScale>
    </View>
  );
}

const makeStyles = (c: Palette) =>
  StyleSheet.create({
    row: { flexDirection: 'row', gap: spacing.sm + 4 },
    card: { flex: 1, gap: 2, padding: spacing.md, borderRadius: radius.lg, backgroundColor: c.surface, borderWidth: 1, borderColor: c.border },
    top: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: spacing.sm },
  });
