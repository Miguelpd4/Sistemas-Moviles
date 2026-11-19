import type { ReactNode } from 'react';
import { KeyboardAvoidingView, Modal, Platform, Pressable, StyleSheet, View } from 'react-native';

import { driverColors, radius, spacing, useStyles, type Palette } from '@/theme';

import { AppText } from './AppText';

type Props = {
  visible: boolean;
  title: string;
  description?: string;
  onClose: () => void;
  children?: ReactNode;
  /** Colores del Modo conductor. */
  dark?: boolean;
};

/** Hoja que sube desde abajo: confirmaciones y pequeños formularios. */
export function Sheet({ visible, title, description, onClose, children, dark = false }: Props) {
  const styles = useStyles(makeStyles);
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <Pressable style={styles.backdrop} onPress={onClose} accessibilityLabel="Cerrar" accessibilityRole="button" />
        <View style={[styles.sheet, dark && styles.sheetDark]} accessibilityViewIsModal>
          <View style={styles.handle} />
          <AppText variant="title" accessibilityRole="header" color={dark ? driverColors.text : undefined}>
            {title}
          </AppText>
          {description ? (
            <AppText style={styles.description} color={dark ? driverColors.textSecondary : undefined}>
              {description}
            </AppText>
          ) : null}
          <View style={styles.body}>{children}</View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const makeStyles = (c: Palette) =>
  StyleSheet.create({
    flex: { flex: 1, justifyContent: 'flex-end' },
    backdrop: { ...StyleSheet.absoluteFill, backgroundColor: c.overlay },
    sheet: {
      backgroundColor: c.surfaceRaised,
      borderTopLeftRadius: radius.lg,
      borderTopRightRadius: radius.lg,
      padding: spacing.lg,
      paddingBottom: spacing.xl,
      gap: spacing.sm,
    },
    sheetDark: { backgroundColor: driverColors.surface },
    handle: {
      alignSelf: 'center',
      width: 44,
      height: 5,
      borderRadius: 3,
      backgroundColor: c.borderStrong,
      marginBottom: spacing.sm,
    },
    description: { color: c.textSecondary },
    body: { gap: spacing.sm, marginTop: spacing.sm },
  });
