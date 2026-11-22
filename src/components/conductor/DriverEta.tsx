import { StyleSheet, View } from 'react-native';

import { AppText } from '@/components/ui';
import { useTripRoute } from '@/hooks/useTripRoute';
import { formatKm } from '@/lib/format';
import type { LatLon } from '@/lib/route';
import type { Destination } from '@/services/supabase/sessions';
import { driverColors, fonts, radius, spacing } from '@/theme';

type Props = { destination: Destination | null; car: LatLon | null };

/** Hora de llegada en el Modo conductor (#29): grande y sin nada que tocar. */
export function DriverEta({ destination, car }: Props) {
  const { route, arrival } = useTripRoute(car, destination);
  if (!destination) return null;
  return (
    <View
      style={styles.box}
      accessible
      accessibilityLabel={arrival && route ? `Llegada a ${destination.name} a las ${arrival}, faltan ${formatKm(route.distanceM)}` : `Destino: ${destination.name}`}
    >
      <AppText variant="bodyStrong" color={driverColors.textSecondary} numberOfLines={1}>
        {destination.name}
      </AppText>
      {arrival && route ? (
        <View style={styles.row}>
          <AppText style={styles.time} color={driverColors.accent}>
            {arrival}
          </AppText>
          <AppText variant="heading" color={driverColors.text}>
            llegada · {formatKm(route.distanceM)}
          </AppText>
        </View>
      ) : (
        <AppText variant="heading" color={driverColors.text}>
          La hora de llegada sale al iniciar el viaje
        </AppText>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  box: { backgroundColor: driverColors.surface, borderRadius: radius.md, padding: spacing.md, gap: 2 },
  row: { flexDirection: 'row', alignItems: 'baseline', gap: spacing.sm, flexWrap: 'wrap' },
  time: { fontFamily: fonts.black, fontSize: 48, lineHeight: 52 },
});
