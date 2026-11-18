import Ionicons from '@expo/vector-icons/Ionicons';
import { StyleSheet, View } from 'react-native';

import { AlbumArt } from '@/components/musica/AlbumArt';
import { AppText } from '@/components/ui';
import type { QueueRow } from '@/services/supabase/queue';
import { driverColors, fonts, radius, spacing } from '@/theme';

/** «♪ Título — Artista» en el Modo conductor, con cuántas quedan en la cola. */
export function NowPlayingLine({ item, upcoming }: { item: QueueRow | null; upcoming: number }) {
  return (
    <View style={styles.row} accessible accessibilityLabel={item ? `Suena ${item.title}, de ${item.artist}` : 'No suena nada'}>
      {item ? (
        <AlbumArt url={item.album_art_url} size={56} radius={radius.sm} />
      ) : (
        <View style={styles.icon}>
          <Ionicons name="musical-notes" size={28} color={driverColors.accent} />
        </View>
      )}
      <View style={styles.text}>
        <AppText style={styles.title} color={driverColors.text} numberOfLines={1}>
          {item ? item.title : 'No suena nada'}
        </AppText>
        <AppText variant="bodyStrong" color={driverColors.textSecondary} numberOfLines={1}>
          {item ? item.artist : 'Los pasajeros añaden canciones desde su móvil'}
          {upcoming > 0 ? ` · ${upcoming} en cola` : ''}
        </AppText>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, backgroundColor: driverColors.surface, borderRadius: radius.md, padding: spacing.sm + 4 },
  icon: { width: 56, height: 56, borderRadius: radius.sm, backgroundColor: driverColors.surfaceStrong, alignItems: 'center', justifyContent: 'center' },
  text: { flex: 1, gap: 2 },
  title: { fontFamily: fonts.bold, fontSize: 24, lineHeight: 29 },
});
