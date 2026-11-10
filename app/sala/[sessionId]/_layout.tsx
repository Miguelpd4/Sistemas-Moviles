import { Tabs } from 'expo-router/js-tabs';

import { TabIcon, tabBarOptions } from '@/components/ui';

// TODO(sala): SessionProvider (Realtime) y botón fijo "Pedir parada".
export default function SalaLayout() {
  return (
    <Tabs screenOptions={tabBarOptions}>
      <Tabs.Screen
        name="index"
        options={{ title: 'Sala', tabBarIcon: (p) => <TabIcon name="people-outline" {...p} /> }}
      />
      <Tabs.Screen
        name="musica"
        options={{ title: 'Música', tabBarIcon: (p) => <TabIcon name="musical-notes-outline" {...p} /> }}
      />
      <Tabs.Screen
        name="juegos"
        options={{ title: 'Juegos', tabBarIcon: (p) => <TabIcon name="game-controller-outline" {...p} /> }}
      />
      <Tabs.Screen
        name="viaje"
        options={{ title: 'Viaje', tabBarIcon: (p) => <TabIcon name="map-outline" {...p} /> }}
      />
      <Tabs.Screen
        name="pagos"
        options={{ title: 'Pagos', tabBarIcon: (p) => <TabIcon name="card-outline" {...p} /> }}
      />
    </Tabs>
  );
}
