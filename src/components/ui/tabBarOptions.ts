import type { TabsScreenOptions } from 'expo-router/js-tabs';
import { useMemo } from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { fonts, useTheme } from '@/theme';

/**
 * Estilo común de las barras inferiores (fuera y dentro del viaje): superficie propia separada del
 * contenido, icono activo en pastilla naranja y etiquetas legibles. Respeta la zona segura inferior.
 */
export function useTabBarOptions(): TabsScreenOptions {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  return useMemo(
    () => ({
      headerShown: false,
      sceneStyle: { backgroundColor: colors.background },
      tabBarActiveTintColor: colors.primaryText,
      tabBarInactiveTintColor: colors.textTertiary,
      tabBarStyle: {
        backgroundColor: colors.surface,
        borderTopColor: colors.border,
        borderTopWidth: 1,
        elevation: 0,
        height: 66 + insets.bottom,
        paddingTop: 7,
        paddingBottom: Math.max(insets.bottom, 8),
      },
      tabBarItemStyle: { gap: 2 },
      tabBarLabelStyle: { fontFamily: fonts.semibold, fontSize: 11, marginTop: 2 },
    }),
    [colors, insets.bottom],
  );
}
