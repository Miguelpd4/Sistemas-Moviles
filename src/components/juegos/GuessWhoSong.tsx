import { memo } from 'react';
import { StyleSheet, View } from 'react-native';

import { AlbumArt } from '@/components/musica/AlbumArt';
import { AppText } from '@/components/ui';
import { radius, spacing, useTheme } from '@/theme';

type Props = { title: string; artist: string; albumArtUrl: string | null };

/** La canción de la ronda de «¿Quién la ha puesto?»: carátula, título y artista. */
function GuessWhoSongBase({ title, artist, albumArtUrl }: Props) {
  const { colors } = useTheme();
  return (
    <View style={styles.row} accessible accessibilityLabel={`Suena ${title}, de ${artist}`}>
      <AlbumArt url={albumArtUrl} size={64} radius={radius.sm} />
      <View style={styles.text}>
        <AppText variant="bodyStrong" numberOfLines={2}>
          {title || 'Canción'}
        </AppText>
        <AppText variant="caption" color={colors.textSecondary} numberOfLines={1}>
          {artist}
        </AppText>
      </View>
    </View>
  );
}

export const GuessWhoSong = memo(GuessWhoSongBase);

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  text: { flex: 1, gap: 2 },
});
