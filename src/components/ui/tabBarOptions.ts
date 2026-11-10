import type { TabsScreenOptions } from 'expo-router/js-tabs';

import { colors } from '@/theme';

/** Estilo común de las barras inferiores (fuera y dentro del viaje). */
export const tabBarOptions: TabsScreenOptions = {
  headerShown: false,
  tabBarActiveTintColor: colors.primaryText,
  tabBarInactiveTintColor: colors.textSecondary,
  tabBarStyle: {
    backgroundColor: colors.background,
    borderTopColor: colors.border,
  },
  tabBarLabelStyle: { fontSize: 12, fontWeight: '600' },
};
