import type { ReactNode } from 'react';
import { ScrollView, StyleSheet } from 'react-native';
import { SafeAreaView, type Edge } from 'react-native-safe-area-context';

import { colors, spacing } from '@/theme';

type Props = {
  children: ReactNode;
  /** Las pantallas con barra inferior no necesitan margen seguro abajo. */
  edges?: Edge[];
  background?: string;
};

/** Contenedor base de pantalla: fondo del tema, márgenes seguros y scroll. */
export function Screen({ children, edges = ['top'], background = colors.background }: Props) {
  return (
    <SafeAreaView edges={edges} style={[styles.safe, { backgroundColor: background }]}>
      <ScrollView contentContainerStyle={styles.content}>{children}</ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  content: { padding: spacing.lg, gap: spacing.md },
});
