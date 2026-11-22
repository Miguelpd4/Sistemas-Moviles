import type { ReactNode } from 'react';
import { RefreshControl, ScrollView, StyleSheet } from 'react-native';
import { SafeAreaView, type Edge } from 'react-native-safe-area-context';

import { spacing, useTheme } from '@/theme';

type Props = {
  children: ReactNode;
  /** Las pantallas con barra inferior no necesitan margen seguro abajo. */
  edges?: Edge[];
  background?: string;
  /** Tirar hacia abajo para recargar. */
  refreshing?: boolean;
  onRefresh?: () => void;
};

/** Contenedor base de pantalla: fondo del tema, márgenes seguros y scroll. */
export function Screen({ children, edges = ['top'], background, refreshing = false, onRefresh }: Props) {
  const { colors } = useTheme();
  return (
    <SafeAreaView edges={edges} style={[styles.safe, { backgroundColor: background ?? colors.background }]}>
      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        refreshControl={
          onRefresh ? <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} colors={[colors.primary]} /> : undefined
        }
      >
        {children}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  content: { paddingHorizontal: spacing.lg - 4, paddingTop: spacing.md, paddingBottom: spacing.xxl, gap: spacing.md },
});
