import { Tabs } from 'expo-router/js-tabs';

import { TabIcon, tabBarOptions } from '@/components/ui';

export default function InicioLayout() {
  return (
    <Tabs screenOptions={tabBarOptions}>
      <Tabs.Screen
        name="index"
        options={{ title: 'Inicio', tabBarIcon: (p) => <TabIcon name="home" {...p} /> }}
      />
      {/* TODO(entrada): ocultar con href: null si el usuario no es conductor. */}
      <Tabs.Screen
        name="mi-coche"
        options={{ title: 'Mi coche', tabBarIcon: (p) => <TabIcon name="car-outline" {...p} /> }}
      />
      <Tabs.Screen
        name="historial"
        options={{ title: 'Historial', tabBarIcon: (p) => <TabIcon name="time-outline" {...p} /> }}
      />
      <Tabs.Screen
        name="cuentas"
        options={{ title: 'Cuentas', tabBarIcon: (p) => <TabIcon name="stats-chart-outline" {...p} /> }}
      />
      <Tabs.Screen
        name="perfil"
        options={{ title: 'Perfil', tabBarIcon: (p) => <TabIcon name="person-outline" {...p} /> }}
      />
    </Tabs>
  );
}
