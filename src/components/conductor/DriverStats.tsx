import { StyleSheet, View } from 'react-native';

import { AppText } from '@/components/ui';
import { useNow } from '@/hooks/useNow';
import { formatDuration, formatKm } from '@/lib/format';
import { driverColors, fonts, radius, spacing } from '@/theme';

type Props = { distanceM: number; startedAt: string | null; passengers: number; connected: number };

/** Kilómetros, tiempo y pasajeros en letra grande, para leerlos de un vistazo. */
export function DriverStats({ distanceM, startedAt, passengers, connected }: Props) {
  const now = useNow(1000);
  const seconds = startedAt ? (now - new Date(startedAt).getTime()) / 1000 : 0;
  return (
    <View style={styles.row}>
      <Stat value={formatKm(distanceM)} label="recorridos" />
      <Stat value={startedAt ? formatDuration(seconds) : '0 min'} label="de viaje" />
      <Stat value={String(passengers)} label={`pasajeros · ${connected} en línea`} />
    </View>
  );
}

function Stat({ value, label }: { value: string; label: string }) {
  return (
    <View style={styles.stat} accessible accessibilityLabel={`${value} ${label}`}>
      <AppText style={styles.value} color={driverColors.text} numberOfLines={1} adjustsFontSizeToFit>
        {value}
      </AppText>
      <AppText variant="caption" color={driverColors.textSecondary} numberOfLines={1}>
        {label}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: spacing.sm },
  stat: { flex: 1, backgroundColor: driverColors.surface, borderRadius: radius.md, padding: spacing.md, gap: 2 },
  value: { fontFamily: fonts.black, fontSize: 28, lineHeight: 32, letterSpacing: -0.8 },
});
