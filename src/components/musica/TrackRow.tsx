import Ionicons from '@expo/vector-icons/Ionicons';
import { memo } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';

import { AppText } from '@/components/ui';
import { radius, spacing, useTheme } from '@/theme';
import { formatClock } from '@/lib/format';
import type { YouTubeTrack } from '@/types/youtube';

import { AlbumArt } from './AlbumArt';

type Props = {
  track: YouTubeTrack;
  disabled: boolean;
  adding: boolean;
  added: boolean;
  onAdd: (track: YouTubeTrack) => void;
};

/** Un resultado de la búsqueda con su botón para añadirlo a la cola. */
function TrackRowBase({ track, disabled, adding, added, onAdd }: Props) {
  const { colors } = useTheme();
  return (
    <View style={styles.row}>
      <AlbumArt url={track.thumbnailUrl} size={52} />
      <View style={styles.text}>
        <AppText variant="bodyStrong" numberOfLines={1}>
          {track.title}
        </AppText>
        <AppText variant="caption" color={colors.textSecondary} numberOfLines={1}>
          {track.artist} · {formatClock(track.durationMs)}
        </AppText>
      </View>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={added ? `${track.title} añadida` : `Añadir ${track.title} a la cola`}
        accessibilityState={{ disabled: disabled || added }}
        disabled={disabled || adding || added}
        onPress={() => onAdd(track)}
        hitSlop={6}
        style={({ pressed }) => [
          styles.add,
          { backgroundColor: added ? colors.successSoft : pressed ? colors.primaryPressed : colors.primary },
          disabled && !added && styles.disabled,
        ]}
      >
        {adding ? (
          <ActivityIndicator color={colors.textOnPrimary} />
        ) : (
          <Ionicons name={added ? 'checkmark' : 'add'} size={24} color={added ? colors.success : colors.textOnPrimary} />
        )}
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingVertical: spacing.xs + 2 },
  text: { flex: 1, gap: 1 },
  add: { width: 44, height: 44, borderRadius: radius.pill, alignItems: 'center', justifyContent: 'center' },
  disabled: { opacity: 0.35 },
});

export const TrackRow = memo(TrackRowBase);
