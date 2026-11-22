import Ionicons from '@expo/vector-icons/Ionicons';
import { Image } from 'expo-image';
import { memo } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import type { Memory } from '@/services/supabase/memories';
import { radius, spacing, useTheme } from '@/theme';

type Props = { memories: readonly Memory[]; onOpen: (memory: Memory) => void; describe: (memory: Memory) => string };

/** Cuadrícula de fotos de recuerdos (#34), tres por fila. */
function MemoryGridBase({ memories, onOpen, describe }: Props) {
  const { colors } = useTheme();
  return (
    <View style={styles.grid}>
      {memories.map((memory) => (
        <Pressable
          key={memory.id}
          accessibilityRole="imagebutton"
          accessibilityLabel={describe(memory)}
          accessibilityHint="Abre la foto"
          onPress={() => onOpen(memory)}
          style={[styles.cell, { backgroundColor: colors.surfaceStrong }]}
        >
          {memory.url ? (
            <Image source={{ uri: memory.url }} style={styles.photo} contentFit="cover" transition={150} />
          ) : (
            <Ionicons name="image-outline" size={28} color={colors.textTertiary} />
          )}
        </Pressable>
      ))}
    </View>
  );
}
export const MemoryGrid = memo(MemoryGridBase);

const styles = StyleSheet.create({
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs + 2 },
  cell: {
    width: '32%',
    aspectRatio: 1,
    borderRadius: radius.sm,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  photo: { width: '100%', height: '100%' },
});
