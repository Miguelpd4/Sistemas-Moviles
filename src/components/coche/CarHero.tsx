import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';

import { AppText, Glow } from '@/components/ui';
import { carModelTitle } from '@/lib/carCatalog';
import { colorLabel } from '@/lib/carColors';
import type { CarLook } from '@/services/supabase/sessions';
import { radius, spacing, useTheme } from '@/theme';

import { CarVisual } from './CarVisual';
import { LicensePlate } from './LicensePlate';

type Props = {
  car: CarLook;
  /** Código de la pegatina, mostrado como matrícula. */
  code?: string | null;
  /** Texto pequeño arriba a la izquierda, por ejemplo «Tu coche» o «Coche de Álvaro». */
  overline?: string;
  /** Datos extra al final de la línea del modelo, por ejemplo «5 plazas». */
  extra?: string | null;
  children?: ReactNode;
  /** Foto recién elegida (vista previa del formulario). */
  localUri?: string | null;
};

/** Tarjeta principal del coche: el coche sobre un resplandor, nombre, modelo y matrícula. */
export function CarHero({ car, code, overline, extra, children, localUri = null }: Props) {
  const { colors, elevation } = useTheme();
  const modelTitle = carModelTitle(car.make, car.model, car.version);
  const details = [modelTitle !== 'Coche' && modelTitle !== car.name ? modelTitle : null, colorLabel(car.color), extra ?? null]
    .filter((part): part is string => part !== null)
    .join(' · ');

  return (
    <View style={[styles.card, { backgroundColor: colors.surfaceRaised, borderColor: colors.border }, elevation]}>
      <Glow cy={0.62} />
      {overline || code ? (
        <View style={styles.top}>
          <AppText variant="label" color={colors.textSecondary} style={styles.overline}>
            {overline ?? ''}
          </AppText>
          {code ? <LicensePlate code={code} size="sm" /> : null}
        </View>
      ) : null}
      <CarVisual car={car} localUri={localUri} />
      <View style={styles.text}>
        <AppText variant="title" numberOfLines={2}>
          {car.name}
        </AppText>
        {details ? <AppText color={colors.textSecondary}>{details}</AppText> : null}
      </View>
      {children ? <View style={styles.children}>{children}</View> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: radius.lg,
    borderWidth: 1,
    padding: spacing.md + 2,
    paddingBottom: spacing.lg - 4,
    gap: spacing.sm,
    overflow: 'hidden',
  },
  top: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.md },
  overline: { flex: 1 },
  text: { gap: 2, marginTop: spacing.xs },
  children: { gap: spacing.sm, marginTop: spacing.sm },
});
