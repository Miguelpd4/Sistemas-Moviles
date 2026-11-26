import Ionicons from '@expo/vector-icons/Ionicons';
import { router } from 'expo-router';
import type { ReactNode } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { radius, spacing, useTheme } from '@/theme';

import { AppText } from './AppText';

type Props = {
  title: string;
  /** Línea pequeña en naranja encima del título (fecha, contexto). */
  eyebrow?: string | null;
  subtitle?: string | null;
  /** Muestra la flecha de volver (pantallas fuera de la barra inferior). */
  back?: boolean;
  /** Algo a la derecha del título, por ejemplo un avatar o un botón. */
  right?: ReactNode;
};

/** Título de pantalla: grande, alineado a la izquierda, con subtítulo opcional. */
export function ScreenHeader({ title, eyebrow, subtitle, back = false, right }: Props) {
  const { colors } = useTheme();
  return (
    <View style={styles.wrapper}>
      {back ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Volver"
          onPress={() => (router.canGoBack() ? router.back() : router.replace('/'))}
          style={({ pressed }) => [
            styles.back,
            { backgroundColor: pressed ? colors.surfaceStrong : colors.surface, borderColor: colors.border },
          ]}
          hitSlop={8}
        >
          <Ionicons name="chevron-back" size={22} color={colors.text} />
        </Pressable>
      ) : null}
      <View style={styles.row}>
        <View style={styles.text}>
          {eyebrow ? (
            <AppText variant="overline" color={colors.primaryText}>
              {eyebrow}
            </AppText>
          ) : null}
          <AppText variant="display" accessibilityRole="header">
            {title}
          </AppText>
          {subtitle ? <AppText color={colors.textSecondary}>{subtitle}</AppText> : null}
        </View>
        {right ? <View>{right}</View> : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { gap: spacing.md, marginBottom: spacing.sm, marginTop: spacing.sm },
  back: { width: 44, height: 44, borderRadius: radius.pill, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  text: { flex: 1, gap: spacing.xs },
});
