import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { router } from 'expo-router';
import { useCallback, useMemo, type ComponentProps } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { TripCard } from '@/components/historial/TripCard';
import { AppText, EmptyState, Glow, Notice, Screen, ScreenHeader } from '@/components/ui';
import { useAuth } from '@/hooks/useAuth';
import { useHistory } from '@/hooks/useHistory';
import { formatDuration, formatEuros, formatKm } from '@/lib/format';
import { groupByMonth } from '@/lib/history';
import { radius, spacing, useStyles, useTheme, type Palette } from '@/theme';

type MciName = ComponentProps<typeof MaterialCommunityIcons>['name'];

/**
 * Historial (#34): mis viajes terminados, del más reciente al más antiguo y por meses, con los
 * totales arriba (viajes, km, tiempo, lo que me ha tocado pagar y el CO₂ ahorrado). Cada viaje
 * abre su Resumen. Se recarga al volver a la pestaña o tirando hacia abajo.
 */
export default function HistorialScreen() {
  const { colors } = useTheme();
  const styles = useStyles(makeStyles);
  const { user } = useAuth();
  const myId = user?.id ?? null;
  const { trips, totals, error, refreshing, refresh } = useHistory(myId);
  const groups = useMemo(() => (trips ? groupByMonth(trips) : []), [trips]);
  const open = useCallback((id: string) => router.push(`/resumen/${id}`), []);

  return (
    <Screen refreshing={refreshing} onRefresh={refresh}>
      <ScreenHeader eyebrow="Tus viajes" title="Historial" />
      {error ? <Notice message={error} /> : null}

      {myId !== null && trips === null && !error ? <ActivityIndicator color={colors.primary} style={styles.loader} /> : null}

      {myId === null || (trips !== null && trips.length === 0) ? (
        <EmptyState
          icon="time-outline"
          title="Aún no hay viajes"
          description="Cuando termines tu primer viaje aparecerá aquí, con quién fuiste, cuántos kilómetros hicisteis y cuánto pagasteis."
        />
      ) : null}

      {totals && totals.trips > 0 ? (
        <View style={styles.hero} accessible accessibilityLabel={`${totals.trips} viajes, ${formatKm(totals.distanceM)} en total`}>
          <Glow cy={0.9} />
          <AppText variant="hero" style={styles.big}>
            {totals.trips}
          </AppText>
          <AppText color={colors.textSecondary}>{totals.trips === 1 ? 'viaje compartido' : 'viajes compartidos'}</AppText>
          <View style={styles.grid}>
            <Total icon="map-marker-distance" label="Recorrido" value={formatKm(totals.distanceM)} />
            <Total icon="timer-outline" label="En la carretera" value={formatDuration(totals.durationS)} />
            <Total icon="cash-multiple" label="Te ha tocado pagar" value={formatEuros(totals.spentCents)} />
            <Total icon="leaf" label="CO₂ ahorrado" value={`${totals.co2SavedKg.toLocaleString('es-ES')} kg`} />
          </View>
          {totals.topCompanion ? (
            <AppText variant="label" color={colors.textSecondary} style={styles.center}>
              Con quien más has viajado: {totals.topCompanion.name} ({totals.topCompanion.trips} viajes)
            </AppText>
          ) : null}
        </View>
      ) : null}

      {groups.map((group) => (
        <View key={group.key} style={styles.group}>
          <AppText variant="label" color={colors.textSecondary} style={styles.month} accessibilityRole="header">
            {group.label}
          </AppText>
          {group.trips.map((trip) => (
            <TripCard key={trip.id} trip={trip} onPress={open} />
          ))}
        </View>
      ))}

      {totals && totals.trips > 0 ? (
        <AppText variant="caption" color={colors.textTertiary} style={styles.center}>
          CO₂ ahorrado: cada persona de más en el coche es un coche menos (unos 120 g por km).
        </AppText>
      ) : null}
      <View style={styles.bottomSpace} />
    </Screen>
  );
}

function Total({ icon, label, value }: { icon: MciName; label: string; value: string }) {
  const { colors } = useTheme();
  const styles = useStyles(makeStyles);
  return (
    <View style={styles.total} accessible accessibilityLabel={`${label}: ${value}`}>
      <MaterialCommunityIcons name={icon} size={20} color={colors.primary} />
      <AppText variant="heading" numberOfLines={1} adjustsFontSizeToFit>
        {value}
      </AppText>
      <AppText variant="caption" color={colors.textSecondary}>
        {label}
      </AppText>
    </View>
  );
}

const makeStyles = (c: Palette) =>
  StyleSheet.create({
    loader: { marginTop: spacing.xl },
    hero: {
      alignItems: 'center',
      gap: spacing.xs,
      padding: spacing.md + 4,
      paddingTop: spacing.lg,
      borderRadius: radius.lg,
      backgroundColor: c.surfaceRaised,
      borderWidth: 1,
      borderColor: c.border,
      overflow: 'hidden',
    },
    big: { fontSize: 64, lineHeight: 68, letterSpacing: -2.5 },
    grid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginTop: spacing.sm, alignSelf: 'stretch' },
    total: { flexBasis: '47%', flexGrow: 1, padding: spacing.sm + 4, borderRadius: radius.md, gap: 2, backgroundColor: c.surface },
    group: { gap: spacing.sm + 2 },
    month: { textTransform: 'capitalize', marginTop: spacing.xs },
    center: { textAlign: 'center' },
    bottomSpace: { height: spacing.lg },
  });
