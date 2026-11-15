import { Tabs } from 'expo-router/js-tabs';

import { TabIcon, useTabBarOptions } from '@/components/ui';

export default function InicioLayout() {
  const options = useTabBarOptions();
  return (
    <Tabs screenOptions={options}>
      <Tabs.Screen
        name="index"
        options={{ title: 'Inicio', tabBarIcon: (p) => <TabIcon name="home" outline="home-outline" {...p} /> }}
      />
      <Tabs.Screen
        name="mi-coche"
        options={{ title: 'Mi coche', tabBarIcon: (p) => <TabIcon name="car-sport" outline="car-sport-outline" {...p} /> }}
      />
      <Tabs.Screen
        name="historial"
        options={{ title: 'Historial', tabBarIcon: (p) => <TabIcon name="time" outline="time-outline" {...p} /> }}
      />
      <Tabs.Screen
        name="cuentas"
        options={{ title: 'Cuentas', tabBarIcon: (p) => <TabIcon name="wallet" outline="wallet-outline" {...p} /> }}
      />
      <Tabs.Screen
        name="perfil"
        options={{ title: 'Perfil', tabBarIcon: (p) => <TabIcon name="person-circle" outline="person-circle-outline" {...p} /> }}
      />
    </Tabs>
  );
}
