import { StyleSheet, View } from 'react-native';

import { AppText } from '@/components/ui';
import { useMyLocation } from '@/hooks/useMyLocation';
import { useTripRoute } from '@/hooks/useTripRoute';
import { formatDuration, formatKm } from '@/lib/format';
import type { LatLon } from '@/lib/route';
import type { Destination } from '@/services/supabase/sessions';
import { driverColors, fonts, radius, spacing } from '@/theme';

type Props = { destination: Destination | null; car: LatLon | null };

/** Hora de llegada en el Modo conductor (#29): grande, desde la ubicación del móvil y sin nada que tocar. */
export function DriverEta({ destination, car }: Props) {
  const me = useMyLocation(destination !== null);
  const here = me.position ? { lat: me.position.lat, lon: me.position.lon } : car;
  const { remainingM, remainingS, arrival } = useTripRoute(here, destination);
  if (!destination) return null;
  const ready = arrival !== null && remainingM !== null && remainingS !== null;
  return (
    <View
      style={styles.box}
      accessible
      accessibilityLabel={
        ready ? `Llegada a ${destination.name} a las ${arrival}, quedan ${formatDuration(remainingS)} y ${formatKm(remainingM)}` : `Destino: ${destination.name}`
      }
    >
      <AppText variant="bodyStrong" color={driverColors.textSecondary} numberOfLines={1}>
        {destination.name}
      </AppText>
      {ready ? (
        <View style={styles.row}>
          <AppText style={styles.time} color={driverColors.accent}>
            {arrival}
          </AppText>
          <AppText variant="heading" color={driverColors.text}>
            llegada · {formatDuration(remainingS)} · {formatKm(remainingM)}
          </AppText>
        </View>
      ) : (
        <AppText variant="heading" color={driverColors.text}>
          {me.error ?? 'Buscando dónde estás…'}
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
