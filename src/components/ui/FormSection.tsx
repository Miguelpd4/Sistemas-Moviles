import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';

import { radius, spacing, useTheme } from '@/theme';

import { AppText } from './AppText';

type Props = {
  title: string;
  description?: string;
  children: ReactNode;
};

/** Bloque de un formulario con su título, sobre una superficie. */
export function FormSection({ title, description, children }: Props) {
  const { colors } = useTheme();
  return (
    <View style={[styles.section, { backgroundColor: colors.surface }]}>
      <View style={styles.head}>
        <AppText variant="heading" accessibilityRole="header">
          {title}
        </AppText>
        {description ? (
          <AppText variant="label" color={colors.textSecondary}>
            {description}
          </AppText>
        ) : null}
      </View>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  section: { gap: spacing.md, padding: spacing.md + 4, borderRadius: radius.lg },
  head: { gap: 2 },
});
