import { StyleSheet, View } from 'react-native';

import { AppText } from '@/components/ui';
import { useNow } from '@/hooks/useNow';
import { formatDuration, formatKm } from '@/lib/format';
import { driverColors, fonts, radius, spacing } from '@/theme';

type Props = { distanceM: number; startedAt: string | null; passengers: number; connected: number };

/** «41,3 km» → número grande «41,3» y unidad «km» debajo, para que la cifra no se corte. */
function splitUnit(text: string): { value: string; unit: string } {
  const match = /^(.*\d)\s*([^\d\s]+)$/.exec(text.trim());
  return match ? { value: match[1] ?? text, unit: match[2] ?? '' } : { value: text, unit: '' };
}

/**
 * Kilómetros, tiempo y pasajeros en letra grande, para leerlos de un vistazo. Sin animaciones ni
 * nada que distraiga: el número arriba y qué es debajo.
 */
export function DriverStats({ distanceM, startedAt, passengers, connected }: Props) {
  const now = useNow(1000);
  const seconds = startedAt ? (now - new Date(startedAt).getTime()) / 1000 : 0;
  const km = splitUnit(formatKm(distanceM));
  const time = splitUnit(startedAt ? formatDuration(seconds) : '0 min');
  return (
    <View style={styles.row}>
      <Stat value={km.value} label={km.unit} detail="recorridos" />
      <Stat value={time.value} label={time.unit} detail="de viaje" />
      <Stat value={String(passengers)} label={passengers === 1 ? 'pasajero' : 'pasajeros'} detail={`${connected} en línea`} />
    </View>
  );
}

function Stat({ value, label, detail }: { value: string; label: string; detail?: string }) {
  return (
    <View style={styles.stat} accessible accessibilityLabel={`${value} ${label}${detail ? `, ${detail}` : ''}`}>
      <AppText style={styles.value} color={driverColors.text} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.6}>
        {value}
      </AppText>
      <AppText variant="label" color={driverColors.textSecondary} numberOfLines={1}>
        {label}
      </AppText>
      {detail ? (
        <AppText variant="caption" color={driverColors.textSecondary} numberOfLines={1}>
          {detail}
        </AppText>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: spacing.sm },
  stat: { flex: 1, backgroundColor: driverColors.surface, borderRadius: radius.md, paddingVertical: spacing.md, paddingHorizontal: spacing.sm + 4, gap: 2 },
  value: { fontFamily: fonts.black, fontSize: 34, lineHeight: 38, letterSpacing: -1 },
});
