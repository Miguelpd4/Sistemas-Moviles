import { PlaceholderScreen } from '@/components/ui';

export default function ViajeScreen() {
  return (
    <PlaceholderScreen
      title="Viaje"
      icon="map-outline"
      emptyTitle="El viaje aún no ha empezado"
      description="Cuando el conductor arranque verás el mapa en vivo, los kilómetros y la hora de llegada."
      sprint={3}
    />
  );
}
