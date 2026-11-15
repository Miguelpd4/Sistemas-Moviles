import { PlaceholderScreen } from '@/components/ui';

export default function ResumenScreen() {
  return (
    <PlaceholderScreen
      title="Resumen del viaje"
      icon="flag-outline"
      emptyTitle="Resumen del viaje"
      description="Distancia, CO₂ ahorrado, lo que paga cada uno, la canción del viaje y quién ganó los juegos."
      sprint={3}
      back
    />
  );
}
