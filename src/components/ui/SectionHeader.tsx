import { memo } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { spacing, useTheme } from '@/theme';

import { AppText } from './AppText';

type Props = {
  title: string;
  /** Antetítulo pequeño en mayúsculas. */
  overline?: string;
  /** Texto de la derecha (número, estado) o un enlace con `onAction`. */
  aside?: string;
  onAction?: () => void;
};

/** Título de una sección dentro de una pantalla, con un dato o un enlace a la derecha. */
function SectionHeaderBase({ title, overline, aside, onAction }: Props) {
  const { colors } = useTheme();
  return (
    <View style={styles.row}>
      <View style={styles.flex}>
        {overline ? (
          <AppText variant="overline" color={colors.primaryText}>
            {overline}
          </AppText>
        ) : null}
        <AppText variant="title" accessibilityRole="header">
          {title}
        </AppText>
      </View>
      {aside ? (
        onAction ? (
          <Pressable accessibilityRole="link" onPress={onAction} hitSlop={10}>
            <AppText variant="label" color={colors.primaryText}>
              {aside}
            </AppText>
          </Pressable>
        ) : (
          <AppText variant="label" color={colors.textSecondary}>
            {aside}
          </AppText>
        )
      ) : null}
    </View>
  );
}

export const SectionHeader = memo(SectionHeaderBase);

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'flex-end', gap: spacing.md, marginTop: spacing.sm },
  flex: { flex: 1, gap: 2 },
});
