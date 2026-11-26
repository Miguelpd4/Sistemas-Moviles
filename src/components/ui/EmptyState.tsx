import Ionicons from '@expo/vector-icons/Ionicons';
import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';

import { radius, spacing, useStyles, useTheme, type AccentName, type Palette } from '@/theme';

import { AppText } from './AppText';
import type { IconName } from './TabIcon';

type Props = {
  icon: IconName;
  /** Color del icono y su halo (naranja por defecto). */
  tint?: 'primary' | AccentName;
  title: string;
  description: string;
  /** Botón u otra acción para salir del estado vacío. */
  action?: ReactNode;
};

/** Bloque sin contenido: qué va aquí y qué hacer ahora. */
export function EmptyState({ icon, title, description, action, tint = 'primary' }: Props) {
  const { colors } = useTheme();
  const styles = useStyles(makeStyles);
  const accent = tint === 'primary' ? { solid: colors.primary, soft: colors.primarySoft } : colors.accents[tint];
  return (
    <View style={styles.wrapper}>
      <View style={[styles.halo, { backgroundColor: accent.soft }]}>
        <View style={[styles.icon, { borderColor: accent.solid }]}>
          <Ionicons name={icon} size={32} color={accent.solid} />
        </View>
      </View>
      <AppText variant="title" style={styles.center}>
        {title}
      </AppText>
      <AppText color={colors.textSecondary} style={styles.center}>
        {description}
      </AppText>
      {action ? <View style={styles.action}>{action}</View> : null}
    </View>
  );
}

const makeStyles = (c: Palette) =>
  StyleSheet.create({
    wrapper: {
      alignItems: 'center',
      gap: spacing.sm,
      paddingVertical: spacing.xl,
      paddingHorizontal: spacing.lg,
      borderRadius: radius.lg,
      backgroundColor: c.surface,
      borderWidth: 1,
      borderColor: c.border,
    },
    halo: {
      width: 104,
      height: 104,
      borderRadius: 52,
      backgroundColor: c.primarySoft,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: spacing.sm,
    },
    icon: {
      width: 68,
      height: 68,
      borderRadius: 34,
      backgroundColor: c.surfaceRaised,
      borderWidth: 1.5,
      alignItems: 'center',
      justifyContent: 'center',
    },
    center: { textAlign: 'center', maxWidth: 320 },
    action: { marginTop: spacing.md, alignSelf: 'stretch' },
  });
