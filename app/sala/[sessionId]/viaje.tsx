import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { useMemo, type ComponentProps } from 'react';
import { StyleSheet, View } from 'react-native';

import { AppText, Badge, Glow, Screen, ScreenHeader } from '@/components/ui';
import { TripMapCard } from '@/components/viaje/TripMapCard';
import { useNow } from '@/hooks/useNow';
import { useSession } from '@/hooks/useSession';
import { useTripMetrics } from '@/hooks/useTripMetrics';
import { formatDuration, formatEuros, formatKm } from '@/lib/format';
import { fuelCostCents, splitEqually } from '@/lib/split';
import { averageSpeedKmh, formatFuelPrice } from '@/lib/tripStatus';
import { radius, spacing, useStyles, useTheme, type Palette } from '@/theme';

type MciName = ComponentProps<typeof MaterialCommunityIcons>['name'];

/**
 * Pestaña Viaje: mapa en vivo con el destino, la ruta y la hora de llegada (#29), y distancia,
 * tiempo, velocidad media, precio del combustible y lo que lleva costando (S2-08).
 */
export default function ViajeScreen() {
  const { colors } = useTheme();
  const styles = useStyles(makeStyles);
  const { sessionId, session, members, isAdmin } = useSession();
  const metrics = useTripMetrics();
  const now = useNow(1000);

  const started = session?.startedAt ? new Date(session.startedAt).getTime() : null;
  const seconds = started ? Math.max(0, (now - started) / 1000) : 0;
  const distance = metrics?.distance_m ?? 0;
  const speed = averageSpeedKmh(distance, seconds);
  const price = session?.fuelPriceEurL ?? null;
  const cost = price && session ? fuelCostCents(distance, session.consumptionL100km, price) : 0;
  const ids = members.map((member) => member.user_id);
  const share = ids.length > 0 ? Math.max(...Object.values(splitEqually(cost, ids))) : 0;
  const carLat = metrics?.last_lat ?? null;
  const carLon = metrics?.last_lon ?? null;
  const car = useMemo(() => (carLat !== null && carLon !== null ? { lat: carLat, lon: carLon } : null), [carLat, carLon]);
  const mapCard = (
    <TripMapCard sessionId={sessionId} destination={session?.destination ?? null} car={session?.status === 'en_curso' ? car : null} canEdit={isAdmin} />
  );

  if (session?.status !== 'en_curso') {
    return (
      <Screen>
        <ScreenHeader eyebrow="Viaje" title="Aún no habéis salido" />
        <View style={styles.waiting}>
          <Glow cy={0.15} />
          <MaterialCommunityIcons name="map-marker-path" size={48} color={colors.primary} />
          <AppText variant="heading" style={styles.center}>
            Cuando el conductor pulse «Iniciar viaje», aquí verás el mapa, los kilómetros, el tiempo y lo que va costando la gasolina.
          </AppText>
        </View>
        {session?.status === 'abierta' ? mapCard : null}
      </Screen>
    );
  }

  return (
    <Screen>
      <ScreenHeader eyebrow="En marcha" title="Viaje" />

      {mapCard}

      <View style={styles.hero} accessible accessibilityLabel={`Habéis recorrido ${formatKm(distance)}`}>
        <Glow cy={0.9} />
        <Badge label="Midiendo con el GPS del conductor" tone="live" />
        <AppText variant="hero" style={styles.big}>
          {formatKm(distance)}
        </AppText>
        <AppText color={colors.textSecondary}>recorridos</AppText>
      </View>

      <View style={styles.grid}>
        <Stat icon="timer-outline" label="Tiempo" value={formatDuration(seconds)} />
        <Stat icon="speedometer" label="Velocidad media" value={speed !== null ? `${speed} km/h` : '—'} />
        <Stat icon="gas-station" label="Combustible" value={price !== null ? `${formatFuelPrice(price)} €/L` : '—'} />
        <Stat icon="account-group" label="En el coche" value={String(members.length)} />
      </View>

      <View style={[styles.cost, { backgroundColor: colors.surface }]}>
        <View style={styles.costRow}>
          <AppText variant="heading" style={styles.flex}>
            Gasolina hasta ahora
          </AppText>
          <AppText variant="title">{formatEuros(cost)}</AppText>
        </View>
        <View style={styles.costRow}>
          <AppText color={colors.textSecondary} style={styles.flex}>
            Te tocaría pagar (a partes iguales, conductor incluido)
          </AppText>
          <AppText variant="heading" color={colors.primaryText}>
            {formatEuros(share)}
          </AppText>
        </View>
        <AppText variant="caption" color={colors.textTertiary}>
          El reparto definitivo, con peajes y parking, se hace al terminar el viaje.
        </AppText>
      </View>
      <View style={styles.bottomSpace} />
    </Screen>
  );
}

function Stat({ icon, label, value }: { icon: MciName; label: string; value: string }) {
  const { colors } = useTheme();
  const styles = useStyles(makeStyles);
  return (
    <View style={[styles.stat, { backgroundColor: colors.surface }]} accessible accessibilityLabel={`${label}: ${value}`}>
      <MaterialCommunityIcons name={icon} size={22} color={colors.primary} />
      <AppText variant="title" numberOfLines={1} adjustsFontSizeToFit>
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
    waiting: {
      alignItems: 'center',
      gap: spacing.md,
      padding: spacing.lg,
      borderRadius: radius.lg,
      backgroundColor: c.surfaceRaised,
      borderWidth: 1,
      borderColor: c.border,
      overflow: 'hidden',
    },
    center: { textAlign: 'center' },
    hero: {
      alignItems: 'center',
      gap: spacing.xs,
      paddingVertical: spacing.xl,
      borderRadius: radius.lg,
      backgroundColor: c.surfaceRaised,
      borderWidth: 1,
      borderColor: c.border,
      overflow: 'hidden',
    },
    big: { fontSize: 64, lineHeight: 68, letterSpacing: -2.5, marginTop: spacing.sm },
    grid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm + 4 },
    stat: { flexBasis: '47%', flexGrow: 1, padding: spacing.md, borderRadius: radius.lg, gap: 4 },
    cost: { padding: spacing.md + 4, borderRadius: radius.lg, gap: spacing.sm },
    costRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
    flex: { flex: 1 },
    bottomSpace: { height: 72 },
  });
