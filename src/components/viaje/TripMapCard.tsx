import Ionicons from '@expo/vector-icons/Ionicons';
import { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';

import { AppText, Notice } from '@/components/ui';
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
  /** Última posición del coche (GPS del conductor), o null si aún no ha salido. */
  car: LatLon | null;
  /** Conductor o copiloto: pueden poner el destino. */
  canEdit: boolean;
};

/** Mapa en vivo con el coche, el destino, la ruta y la hora de llegada (#29). */
export function TripMapCard({ sessionId, destination, car, canEdit }: Props) {
  const { colors } = useTheme();
  const styles = useStyles(makeStyles);
  const { route, remainingS, arrival, error } = useTripRoute(car, destination);

  const state = useMemo<MapState>(
    () => ({
      car,
      dest: destination ? { lat: destination.lat, lon: destination.lon, name: destination.name } : null,
      path: route?.path ?? [],
      follow: true,
    }),
    [car, destination, route],
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

      {route && remainingS !== null && arrival ? (
        <View style={styles.eta} accessible accessibilityLabel={`Llegada a las ${arrival}, faltan ${formatKm(route.distanceM)}`}>
          <AppText color={colors.textSecondary}>Llegada</AppText>
          <AppText variant="title" color={colors.primaryText}>
            {arrival}
          </AppText>
          <AppText color={colors.textSecondary} style={styles.flex}>
            · faltan {formatKm(route.distanceM)} · {formatDuration(remainingS)}
          </AppText>
        </View>
      ) : destination && car === null ? (
        <AppText variant="caption" color={colors.textSecondary}>
          La hora de llegada sale cuando el conductor inicie el viaje y el GPS marque dónde estáis.
        </AppText>
      ) : null}
      {error ? <Notice message={error} /> : null}

      {destination || car ? (
        <LiveMap state={state} />
      ) : null}
      <AppText variant="caption" color={colors.textTertiary}>
        Mapa © OpenStreetMap · ruta de OSRM. La posición se actualiza cada 15 s con el GPS del conductor.
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
