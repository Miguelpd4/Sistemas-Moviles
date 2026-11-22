import Ionicons from '@expo/vector-icons/Ionicons';
import { Image } from 'expo-image';
import { Modal, Pressable, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppText, Button } from '@/components/ui';
import type { Memory } from '@/services/supabase/memories';
import { driverColors, spacing } from '@/theme';

type Props = {
  memory: Memory | null;
  /** «Bea · sáb 22 nov · 18:40». */
  subtitle: string;
  canDelete: boolean;
  deleting: boolean;
  onDelete: (memory: Memory) => void;
  onClose: () => void;
};

/** Una foto del muro a pantalla completa, con quién la subió, su pie y «Borrar» si es mía. */
export function MemoryViewer({ memory, subtitle, canDelete, deleting, onDelete, onClose }: Props) {
  return (
    <Modal visible={memory !== null} animationType="fade" onRequestClose={onClose} transparent>
      <SafeAreaView style={styles.backdrop}>
        <View style={styles.top}>
          <AppText color={driverColors.textSecondary} style={styles.flex} numberOfLines={1}>
            {subtitle}
          </AppText>
          <Pressable accessibilityRole="button" accessibilityLabel="Cerrar la foto" onPress={onClose} hitSlop={12}>
            <Ionicons name="close" size={30} color={driverColors.text} />
          </Pressable>
        </View>
        {memory?.url ? (
          <Image
            source={{ uri: memory.url }}
            style={styles.photo}
            contentFit="contain"
            accessibilityLabel={memory.caption ?? 'Foto del viaje'}
          />
        ) : (
          <View style={styles.photo} />
        )}
        {memory?.caption ? (
          <AppText variant="heading" color={driverColors.text} style={styles.caption}>
            {memory.caption}
          </AppText>
        ) : null}
        {memory && canDelete ? (
          <View style={styles.actions}>
            <Button label="Borrar foto" icon="trash-outline" variant="danger" loading={deleting} onPress={() => onDelete(memory)} />
          </View>
        ) : null}
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: driverColors.background, padding: spacing.md, gap: spacing.md },
  top: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  flex: { flex: 1 },
  photo: { flex: 1, width: '100%' },
  caption: { textAlign: 'center' },
  actions: { paddingBottom: spacing.sm },
});
