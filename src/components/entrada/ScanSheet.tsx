import Ionicons from '@expo/vector-icons/Ionicons';
import { Modal, StyleSheet, View } from 'react-native';

import { AppText, Button, Notice } from '@/components/ui';
import { colors, radius, spacing } from '@/theme';

type Props = {
  visible: boolean;
  scanning: boolean;
  error: string | null;
  onCancel: () => void;
  onRetry: () => void;
};

/** Hoja inferior mientras se espera la pegatina (solo Android con NFC). */
export function ScanSheet({ visible, scanning, error, onCancel, onRetry }: Props) {
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onCancel}>
      <View style={styles.backdrop}>
        <View style={styles.sheet} accessibilityViewIsModal>
          <Ionicons name="radio-outline" size={56} color={colors.primary} style={styles.icon} />
          <AppText variant="title" accessibilityRole="header" style={styles.center}>
            Acerca el móvil a la pegatina del coche
          </AppText>
          <AppText color={colors.textSecondary} style={styles.center}>
            Suele estar en el salpicadero o en la puerta. Mantén el móvil quieto un segundo.
          </AppText>
          {error !== null ? <Notice message={error} /> : null}
          {error !== null && !scanning ? <Button label="Volver a intentarlo" onPress={onRetry} /> : null}
          <Button label="Cancelar" variant="secondary" onPress={onCancel} />
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, justifyContent: 'flex-end', backgroundColor: colors.overlay },
  sheet: {
    backgroundColor: colors.background,
    borderTopLeftRadius: radius.lg,
    borderTopRightRadius: radius.lg,
    padding: spacing.lg,
    paddingBottom: spacing.xl,
    gap: spacing.md,
  },
  icon: { alignSelf: 'center' },
  center: { textAlign: 'center' },
});
