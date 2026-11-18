import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { CarForm } from '@/components/coche/CarForm';
import { DriverAuthForm } from '@/components/coche/DriverAuthForm';
import { DriverProfileForm } from '@/components/coche/DriverProfileForm';
import { StickerCard } from '@/components/coche/StickerCard';
import { Button, Notice, Screen, ScreenHeader } from '@/components/ui';
import { useAuth } from '@/hooks/useAuth';
import { useMyCar } from '@/hooks/useMyCar';
import { spacing, useTheme } from '@/theme';

/** Mi coche (S1-07): cuenta del conductor, datos del coche y código de la pegatina. */
export default function MiCocheScreen() {
  const { colors } = useTheme();
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
        <ScreenHeader
          eyebrow="Para conductores"
          title="Mi coche"
          subtitle="Crea tu cuenta y registra tu coche. Te damos el código para grabar en la pegatina."
        />
        <DriverAuthForm />
      </Screen>
    );
  }

  return (
    <Screen>
      <ScreenHeader eyebrow={user?.email ?? null} title="Mi coche" />

      {error !== null ? (
        <>
          <Notice message={error} />
          <Button label="Reintentar" variant="secondary" icon="refresh" onPress={reload} />
        </>
      ) : loading && car === null ? (
        <ActivityIndicator color={colors.primary} />
      ) : (
        <>
          {/* La clave hace que el formulario se rellene de nuevo cuando llega el coche. */}
          <CarForm key={car?.id ?? 'nuevo'} car={car} onSave={save} />
          {car ? <StickerCard code={car.nfc_code} /> : null}
        </>
      )}

      <View style={styles.footer}>
        {profile ? <DriverProfileForm key={profile.id} /> : null}
        <Button
          label="Cerrar sesión"
          variant="danger"
          icon="log-out-outline"
          onPress={() => void signOut().catch(() => undefined)}
        />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  footer: { gap: spacing.md, marginTop: spacing.lg },
});
