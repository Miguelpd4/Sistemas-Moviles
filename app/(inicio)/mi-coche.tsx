import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { CarForm } from '@/components/coche/CarForm';
import { CarHero } from '@/components/coche/CarHero';
import { DriverAuthForm } from '@/components/coche/DriverAuthForm';
import { DriverProfileForm } from '@/components/coche/DriverProfileForm';
import { StickerCard } from '@/components/coche/StickerCard';
import { Button, Notice, Screen, ScreenHeader, SectionHeader, Skeleton, StatTile } from '@/components/ui';
import { useAuth } from '@/hooks/useAuth';
import { useMyCar } from '@/hooks/useMyCar';
import { colorLabel } from '@/lib/carColors';
import { FUEL_TYPES } from '@/lib/carForm';
import { carLook } from '@/services/supabase/cars';
import { spacing } from '@/theme';

/**
 * Mi coche (S1-07): la ficha del coche (cómo lo ven los pasajeros, sus datos, la pegatina y el QR)
 * y, al tocar «Editar», el formulario. Sin cuenta de conductor, el registro.
 */
export default function MiCocheScreen() {
  const { loading: authLoading, isAnonymous, profile, user, signOut } = useAuth();
  const { car, loading, error, reload, save } = useMyCar();
  const [editing, setEditing] = useState(false);

  if (authLoading) {
    return (
      <Screen>
        <Skeleton height={44} width="55%" />
        <Skeleton height={280} rounded={28} />
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

  const fuel = car ? (FUEL_TYPES.find((option) => option.value === car.fuel_type)?.label ?? car.fuel_type) : '';
  const showForm = car === null || editing;

  return (
    <Screen>
      <ScreenHeader eyebrow="Cuenta de conductor" title="Mi coche" subtitle={user?.email ?? null} />

      {error !== null ? (
        <Notice message={error} action={{ label: 'Reintentar', onPress: () => void reload() }} />
      ) : loading && car === null ? (
        <Skeleton height={300} rounded={28} />
      ) : showForm ? (
        <>
          {/* La clave hace que el formulario se rellene de nuevo cuando llega el coche. */}
          <CarForm
            key={car?.id ?? 'nuevo'}
            car={car}
            onSave={async (values, photo) => {
              const result = await save(values, photo);
              setEditing(false);
              return result;
            }}
          />
          {car ? <Button label="Cancelar" variant="ghost" icon="close" onPress={() => setEditing(false)} /> : null}
        </>
      ) : car ? (
        <>
          <CarHero car={carLook(car)} code={car.nfc_code} overline="Tu coche" extra={`${car.seats} plazas`} />
          <View style={styles.grid}>
            <StatTile icon="gas-station" tint="amber" label="Consumo medio" value={`${String(car.consumption_l_100km).replace('.', ',')} L/100`} />
            <StatTile icon="fuel" tint="blue" label="Combustible" value={fuel} />
            <StatTile icon="seat-passenger" tint="violet" label="Plazas (con el conductor)" value={String(car.seats)} />
            <StatTile icon="palette-outline" tint="pink" label="Color" value={colorLabel(car.color) ?? 'Sin color'} />
          </View>
          <Button label="Editar datos del coche" variant="secondary" icon="create-outline" onPress={() => setEditing(true)} />
          <StickerCard code={car.nfc_code} />
        </>
      ) : null}

      <View style={styles.footer}>
        <SectionHeader overline="Para cobrar los viajes" title="Tus datos" />
        {profile ? <DriverProfileForm key={profile.id} /> : null}
        <Button label="Cerrar sesión" variant="danger" icon="log-out-outline" onPress={() => void signOut().catch(() => undefined)} />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm + 4 },
  footer: { gap: spacing.md, marginTop: spacing.md },
});
