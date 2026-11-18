import Ionicons from '@expo/vector-icons/Ionicons';
import { Image } from 'expo-image';
import { memo } from 'react';
import { StyleSheet, View } from 'react-native';

import { useTheme } from '@/theme';

/** Carátula de la canción, o una nota musical si no hay. */
function AlbumArtBase({ url, size, radius = 10 }: { url: string | null; size: number; radius?: number }) {
  const { colors } = useTheme();
  const shape = { width: size, height: size, borderRadius: radius };
  if (url) return <Image source={{ uri: url }} style={[shape, { backgroundColor: colors.surfaceStrong }]} contentFit="cover" transition={150} />;
  return (
    <View style={[shape, styles.empty, { backgroundColor: colors.primarySoft }]}>
      <Ionicons name="musical-notes" size={size * 0.42} color={colors.primary} />
    </View>
  );
}

const styles = StyleSheet.create({ empty: { alignItems: 'center', justifyContent: 'center' } });

export const AlbumArt = memo(AlbumArtBase);
