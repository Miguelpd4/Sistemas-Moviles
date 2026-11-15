import type { TabsScreenOptions } from 'expo-router/js-tabs';
import { useMemo } from 'react';

import { fonts, useTheme } from '@/theme';

/** Estilo común de las barras inferiores (fuera y dentro del viaje), según el tema. */
export function useTabBarOptions(): TabsScreenOptions {
  const { colors } = useTheme();
  return useMemo(
    () => ({
      headerShown: false,
      sceneStyle: { backgroundColor: colors.background },
      tabBarActiveTintColor: colors.primary,
      tabBarInactiveTintColor: colors.textTertiary,
      tabBarStyle: {
        backgroundColor: colors.background,
        borderTopColor: colors.border,
        elevation: 0,
      },
      tabBarLabelStyle: { fontFamily: fonts.semibold, fontSize: 11 },
    }),
    [colors],
  );
}
