import Ionicons from '@expo/vector-icons/Ionicons';
import { Modal, StyleSheet, View } from 'react-native';

import { AppText, Button, Notice } from '@/components/ui';
import { radius, spacing, useStyles, useTheme, type Palette } from '@/theme';

type Props = {
  visible: boolean;
  scanning: boolean;
  error: string | null;
  onCancel: () => void;
  onRetry: () => void;
};

/** Hoja inferior mientras se espera la pegatina (solo Android con NFC). */
export function ScanSheet({ visible, scanning, error, onCancel, onRetry }: Props) {
  const { colors } = useTheme();
  const styles = useStyles(makeStyles);
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onCancel}>
      <View style={styles.backdrop}>
        <View style={styles.sheet} accessibilityViewIsModal>
          <View style={styles.halo}>
            <View style={styles.core}>
              <Ionicons name="radio-outline" size={44} color={colors.textOnPrimary} />
            </View>
          </View>
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

const makeStyles = (colors: Palette) =>
  StyleSheet.create({
  backdrop: { flex: 1, justifyContent: 'flex-end', backgroundColor: colors.overlay },
  sheet: {
    backgroundColor: colors.surfaceRaised,
    borderTopLeftRadius: radius.lg,
    borderTopRightRadius: radius.lg,
    padding: spacing.lg,
    paddingBottom: spacing.xl,
    gap: spacing.md,
  },
  halo: {
    alignSelf: 'center',
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.sm,
  },
  core: {
    width: 76,
    height: 76,
    borderRadius: 38,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  center: { textAlign: 'center' },
  });
