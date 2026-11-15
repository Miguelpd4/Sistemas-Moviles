import { Tabs } from 'expo-router/js-tabs';

import { TabIcon, useTabBarOptions } from '@/components/ui';

// TODO(sala): SessionProvider (Realtime) y botón fijo "Pedir parada".
export default function SalaLayout() {
  const options = useTabBarOptions();
  return (
    <Tabs screenOptions={options}>
      <Tabs.Screen
        name="index"
        options={{ title: 'Sala', tabBarIcon: (p) => <TabIcon name="people" outline="people-outline" {...p} /> }}
      />
      <Tabs.Screen
        name="musica"
        options={{ title: 'Música', tabBarIcon: (p) => <TabIcon name="musical-notes" outline="musical-notes-outline" {...p} /> }}
      />
      <Tabs.Screen
        name="juegos"
        options={{ title: 'Juegos', tabBarIcon: (p) => <TabIcon name="game-controller" outline="game-controller-outline" {...p} /> }}
      />
      <Tabs.Screen
        name="viaje"
        options={{ title: 'Viaje', tabBarIcon: (p) => <TabIcon name="map" outline="map-outline" {...p} /> }}
      />
      <Tabs.Screen
        name="pagos"
        options={{ title: 'Pagos', tabBarIcon: (p) => <TabIcon name="card" outline="card-outline" {...p} /> }}
      />
    </Tabs>
  );
}
