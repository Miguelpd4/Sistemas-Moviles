import { Image } from 'expo-image';
import { memo, useState } from 'react';
import { StyleSheet, View, type LayoutChangeEvent } from 'react-native';

import { AppText } from '@/components/ui';
import { carModelTitle } from '@/lib/carCatalog';
import type { CarLook } from '@/services/supabase/sessions';
import { publicUrl } from '@/services/supabase/storage';
import { radius, spacing, useTheme } from '@/theme';

import { CarSilhouette } from './CarSilhouette';

type Props = {
  car: CarLook;
  /** Alto/ancho de la caja. 0.5 es 2:1. */
  ratio?: number;
  /** Foto recién elegida en el móvil (aún sin subir): manda sobre todo lo demás. */
  localUri?: string | null;
};

/**
 * El coche en imagen, por orden de preferencia: la foto propia que subió el conductor, la foto
 * del modelo (Wikipedia) y, si no hay ninguna o no carga, la silueta pintada de su color.
 * La silueta va sobre fondo transparente para que se vea el resplandor de la tarjeta.
 */
function CarVisualBase({ car, ratio = 0.5, localUri = null }: Props) {
  const { colors } = useTheme();
  const [width, setWidth] = useState(0);
  const [failed, setFailed] = useState<string | null>(null);

  const ownPhoto = car.photoPath ? publicUrl('coches', car.photoPath) : null;
  const candidate = localUri ?? ownPhoto ?? car.imageUrl;
  const source = candidate && candidate !== failed ? candidate : null;
  const fromWikipedia = source !== null && source === car.imageUrl && ownPhoto === null && localUri === null;

  const onLayout = (event: LayoutChangeEvent) => setWidth(event.nativeEvent.layout.width);
  const label = `${car.name}, ${carModelTitle(car.make, car.model, car.version)}`;

  return (
    <View
      onLayout={onLayout}
      style={[styles.box, { aspectRatio: 1 / ratio }, source !== null && { backgroundColor: colors.surfaceStrong }]}
      accessible
      accessibilityRole="image"
      accessibilityLabel={label}
    >
      {source ? (
        <>
          <Image
            source={{ uri: source }}
            style={StyleSheet.absoluteFill}
            contentFit="cover"
            transition={250}
            onError={() => setFailed(source)}
          />
          {fromWikipedia ? (
            <View style={[styles.credit, { backgroundColor: colors.overlay }]}>
              <AppText variant="caption" color={colors.textOnPrimary} style={styles.creditText}>
                Foto: Wikipedia
              </AppText>
            </View>
          ) : null}
        </>
      ) : width > 0 ? (
        <View style={styles.silhouette}>
          <CarSilhouette color={car.color} width={Math.min(width * 0.94, 440)} />
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  box: { width: '100%', overflow: 'hidden', borderRadius: radius.md },
  silhouette: { flex: 1, alignItems: 'center', justifyContent: 'flex-end', paddingBottom: spacing.xs },
  credit: {
    position: 'absolute',
    right: spacing.sm,
    bottom: spacing.sm,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
  },
  creditText: { fontSize: 11, lineHeight: 14 },
});

export const CarVisual = memo(CarVisualBase);
