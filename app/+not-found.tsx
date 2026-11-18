import { router } from 'expo-router';

import { Button, EmptyState, Screen, ScreenHeader } from '@/components/ui';

export default function NotFoundScreen() {
  return (
    <Screen>
      <ScreenHeader title="Página no encontrada" back />
      <EmptyState
        icon="compass-outline"
        title="Esta pantalla no existe"
        description="Puede que el enlace esté mal escrito o que el viaje ya haya terminado."
        action={<Button label="Volver al inicio" onPress={() => router.replace('/')} />}
      />
    </Screen>
  );
}
