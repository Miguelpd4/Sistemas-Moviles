import { router } from 'expo-router';
import { useCallback, useMemo } from 'react';
import { StyleSheet, View } from 'react-native';

import { TripCard } from '@/components/historial/TripCard';
import { AppText, EmptyState, Glow, Notice, Screen, ScreenHeader, SkeletonCards, StatTile } from '@/components/ui';
import { useAuth } from '@/hooks/useAuth';
import { useHistory } from '@/hooks/useHistory';
import { formatDuration, formatEuros, formatKm } from '@/lib/format';
import { groupByMonth } from '@/lib/history';
import { radius, spacing, useStyles, useTheme, type Palette } from '@/theme';

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

      {myId !== null && trips === null && !error ? <SkeletonCards count={3} height={120} /> : null}

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
            <StatTile icon="map-marker-distance" tint="blue" label="Recorrido" value={formatKm(totals.distanceM)} />
            <StatTile icon="timer-outline" tint="violet" label="En la carretera" value={formatDuration(totals.durationS)} />
            <StatTile icon="cash-multiple" tint="amber" label="Te ha tocado pagar" value={formatEuros(totals.spentCents)} />
            <StatTile icon="leaf" tint="green" label="CO₂ ahorrado" value={`${totals.co2SavedKg.toLocaleString('es-ES')} kg`} />
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
          <AppText variant="overline" color={colors.textSecondary} style={styles.month} accessibilityRole="header">
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

const makeStyles = (c: Palette) =>
  StyleSheet.create({
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
    group: { gap: spacing.sm + 2 },
    month: { marginTop: spacing.sm },
    center: { textAlign: 'center' },
    bottomSpace: { height: spacing.lg },
  });
