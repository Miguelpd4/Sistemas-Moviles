import { ActivityIndicator } from 'react-native';

import { CarForm } from '@/components/coche/CarForm';
import { DriverAuthForm } from '@/components/coche/DriverAuthForm';
import { DriverProfileForm } from '@/components/coche/DriverProfileForm';
import { StickerCard } from '@/components/coche/StickerCard';
import { AppText, Button, Notice, Screen } from '@/components/ui';
import { useAuth } from '@/hooks/useAuth';
import { useMyCar } from '@/hooks/useMyCar';
import { colors } from '@/theme';

/** Mi coche (S1-07): cuenta del conductor, datos del coche y código de la pegatina. */
export default function MiCocheScreen() {
  const { loading: authLoading, isAnonymous, profile, user, signOut } = useAuth();
  const { car, loading, error, reload, save } = useMyCar();

  if (authLoading) {
    return (
      <Screen>
        <ActivityIndicator color={colors.primary} />
      </Screen>
    );
  }

  if (isAnonymous) {
    return (
      <Screen>
        <AppText variant="title" accessibilityRole="header">
          Mi coche
        </AppText>
        <AppText color={colors.textSecondary}>
          Si vas a conducir, crea tu cuenta y registra tu coche. Te daremos el código para grabar en la pegatina.
        </AppText>
        <DriverAuthForm />
      </Screen>
    );
  }

  return (
    <Screen>
      <AppText variant="title" accessibilityRole="header">
        Mi coche
      </AppText>
      <AppText color={colors.textSecondary}>{user?.email}</AppText>

      {error !== null ? (
        <>
          <Notice message={error} />
          <Button label="Reintentar" variant="secondary" onPress={reload} />
        </>
      ) : loading && car === null ? (
        <ActivityIndicator color={colors.primary} />
      ) : (
        <>
          {car ? <StickerCard code={car.nfc_code} /> : null}
          {/* La clave hace que el formulario se rellene de nuevo cuando llega el coche. */}
          <CarForm key={car?.id ?? 'nuevo'} car={car} onSave={save} />
        </>
      )}

      {profile ? <DriverProfileForm key={profile.id} /> : null}
      <Button label="Cerrar sesión" variant="secondary" onPress={() => void signOut().catch(() => undefined)} />
    </Screen>
  );
}
