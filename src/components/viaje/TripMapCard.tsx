import Ionicons from '@expo/vector-icons/Ionicons';
import { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';

import { AppText, Notice } from '@/components/ui';
import { useMyLocation } from '@/hooks/useMyLocation';
import { useTripRoute } from '@/hooks/useTripRoute';
import { formatDuration, formatKm } from '@/lib/format';
import type { LatLon } from '@/lib/route';
import type { Destination } from '@/services/supabase/sessions';
import { radius, spacing, useStyles, useTheme, type Palette } from '@/theme';

import { DestinationPicker } from './DestinationPicker';
import { LiveMap } from './LiveMap';
import type { MapState } from './mapState';

type Props = {
  sessionId: string;
  destination: Destination | null;
  /** Última posición del coche que sube el conductor (si este móvil no da su ubicación). */
  car: LatLon | null;
  /** Conductor o copiloto: pueden poner el destino. */
  canEdit: boolean;
};

/**
 * Mapa en vivo como un navegador (#29): sale desde tu ubicación (GPS de este móvil; si no la da,
 * la última del coche), enseña la ruta que queda y el tiempo, los km y la hora de llegada al avanzar.
 */
export function TripMapCard({ sessionId, destination, car, canEdit }: Props) {
  const { colors } = useTheme();
  const styles = useStyles(makeStyles);
  const me = useMyLocation();
  const here = useMemo(
    () => (me.position ? { lat: me.position.lat, lon: me.position.lon } : car),
    [me.position, car],
  );
  const { remainingM, remainingS, arrival, path, error } = useTripRoute(here, destination);

  const state = useMemo<MapState>(
    () => ({
      car: here,
      dest: destination ? { lat: destination.lat, lon: destination.lon, name: destination.name } : null,
      path,
      follow: true,
    }),
    [here, destination, path],
  );

  return (
    <View style={styles.card}>
      {canEdit ? (
        <DestinationPicker sessionId={sessionId} destination={destination} />
      ) : (
        <View style={styles.row}>
          <Ionicons name="flag-outline" size={22} color={colors.primary} />
          <AppText variant="bodyStrong" style={styles.flex} numberOfLines={1}>
            {destination ? destination.name : 'Sin destino: el copiloto puede ponerlo'}
          </AppText>
        </View>
      )}

      {remainingS !== null && remainingM !== null && arrival ? (
        <View
          style={styles.eta}
          accessible
          accessibilityLabel={`Quedan ${formatDuration(remainingS)} y ${formatKm(remainingM)}. Llegada a las ${arrival}`}
        >
          <AppText variant="title" color={colors.primaryText}>
            {formatDuration(remainingS)}
          </AppText>
          <AppText color={colors.textSecondary} style={styles.flex}>
            ({formatKm(remainingM)}) · llegada {arrival}
          </AppText>
        </View>
      ) : destination && here === null ? (
        <AppText variant="caption" color={colors.textSecondary}>
          Buscando dónde estás para calcular la ruta…
        </AppText>
      ) : null}
      {error ? <Notice message={error} /> : null}
      {me.error && here === null ? <Notice message={me.error} /> : null}

      {destination || here ? <LiveMap state={state} /> : null}
      <AppText variant="caption" color={colors.textTertiary}>
        {me.position
          ? 'Sales desde tu ubicación en directo. Si os salís de la ruta, se calcula otra.'
          : 'Sin tu ubicación: se usa la última posición del coche (cada 15 s).'}{' '}
        Mapa © OpenStreetMap · rutas de OSRM.
      </AppText>
    </View>
  );
}

const makeStyles = (c: Palette) =>
  StyleSheet.create({
    card: { gap: spacing.sm + 2, padding: spacing.md, borderRadius: radius.lg, backgroundColor: c.surfaceRaised, borderWidth: 1, borderColor: c.border },
    row: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
    eta: { flexDirection: 'row', alignItems: 'baseline', gap: spacing.sm, flexWrap: 'wrap' },
    flex: { flex: 1 },
  });
