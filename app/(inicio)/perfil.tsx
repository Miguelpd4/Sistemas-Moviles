import { router } from 'expo-router';

import { AppText, Avatar, Button, Card, Screen } from '@/components/ui';
import { useAuth } from '@/hooks/useAuth';
import { colors } from '@/theme';

/**
 * Perfil. Los recuerdos (historial, estadísticas y muro de fotos) llegan en el Sprint 4.
 * En desarrollo muestra los accesos a las pruebas técnicas del Sprint 1.
 */
export default function PerfilScreen() {
  const { profile, isAnonymous } = useAuth();

  return (
    <Screen>
      <AppText variant="title" accessibilityRole="header">
        Perfil
      </AppText>
      <Card>
        {profile ? <Avatar kind={profile.avatar_kind} value={profile.avatar_value} size={64} /> : null}
        <AppText variant="heading">{profile?.display_name || 'Sin nombre todavía'}</AppText>
        <AppText color={colors.textSecondary}>
          {isAnonymous ? 'Pasajero sin registro' : 'Conductor'}
        </AppText>
      </Card>
      <Card>
        <AppText color={colors.textSecondary}>
          Recuerdos: historial, estadísticas y muro de fotos de 7 días (Sprint 4).
        </AppText>
      </Card>

      {__DEV__ ? (
        <Card>
          <AppText variant="heading">Pruebas técnicas (solo en desarrollo)</AppText>
          <Button label="Prueba de Spotify" variant="secondary" onPress={() => router.push('/dev/spotify')} />
          <Button label="Prueba de GPS y carburantes" variant="secondary" onPress={() => router.push('/dev/gps')} />
          <Button label="Abrir la pegatina DEMO2345" variant="secondary" onPress={() => router.push({ pathname: '/c/[carCode]', params: { carCode: 'DEMO2345' } })} />
        </Card>
      ) : null}
    </Screen>
  );
}
