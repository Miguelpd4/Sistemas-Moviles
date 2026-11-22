import Ionicons from '@expo/vector-icons/Ionicons';
import { memo } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { CarVisual } from '@/components/coche/CarVisual';
import { AppText, Avatar, Badge } from '@/components/ui';
import { formatDuration, formatEuros, formatKm } from '@/lib/format';
import { tripDateLabel, type HistoryTrip } from '@/lib/history';
import { radius, spacing, useStyles, useTheme, type Palette } from '@/theme';

type Props = { trip: HistoryTrip; onPress: (id: string) => void };

const MAX_AVATARS = 4;

/** Un viaje del historial (#34): coche, cuándo, con quién, cuánto y si queda algo por pagar. Abre el Resumen. */
function TripCardBase({ trip, onPress }: Props) {
  const { colors } = useTheme();
  const styles = useStyles(makeStyles);
  const title = trip.destinationName ? `A ${trip.destinationName}` : trip.iDrove ? 'Conducías tú' : `Con ${trip.driverName}`;
  const who = trip.iDrove ? 'Conducías tú' : `Conducía ${trip.driverName}`;
  const status =
    trip.oweCents > 0
      ? { label: `Debes ${formatEuros(trip.oweCents)}`, tone: 'danger' as const }
      : trip.owedCents > 0
        ? { label: `Te deben ${formatEuros(trip.owedCents)}`, tone: 'primary' as const }
        : trip.totalCents > 0
          ? { label: 'Todo pagado', tone: 'success' as const }
          : null;
  const shown = trip.companions.slice(0, MAX_AVATARS);
  const more = trip.companions.length - shown.length;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${title}, ${tripDateLabel(trip.date)}. ${who}. ${formatKm(trip.distanceM)}. Te tocó ${formatEuros(trip.myShareCents)}${status ? `. ${status.label}` : ''}`}
      accessibilityHint="Abre el resumen del viaje"
      onPress={() => onPress(trip.id)}
      style={({ pressed }) => [styles.card, pressed && { backgroundColor: colors.surfaceStrong }]}
    >
      <View style={styles.top}>
        <View style={styles.car}>
          <CarVisual car={trip.car} ratio={0.62} />
        </View>
        <View style={styles.flex}>
          <AppText variant="caption" color={colors.primaryText}>
            {tripDateLabel(trip.date)}
          </AppText>
          <AppText variant="heading" numberOfLines={1}>
            {title}
          </AppText>
          <AppText variant="caption" color={colors.textSecondary} numberOfLines={1}>
            {trip.car.name} · {who}
          </AppText>
        </View>
        <Ionicons name="chevron-forward" size={20} color={colors.textTertiary} />
      </View>

      <View style={styles.stats}>
        <Stat icon="speedometer-outline" text={formatKm(trip.distanceM)} />
        <Stat icon="time-outline" text={formatDuration(trip.durationS)} />
        <Stat icon="leaf-outline" text={`${trip.co2SavedKg.toLocaleString('es-ES')} kg CO₂`} />
      </View>

      <View style={styles.bottom}>
        <View style={styles.people}>
          {shown.map((person) => (
            <View key={person.id} style={styles.avatar}>
              <Avatar kind={person.avatarKind} value={person.avatarValue} size={28} />
            </View>
          ))}
          {more > 0 ? (
            <AppText variant="caption" color={colors.textSecondary}>
              {' '}+{more}
            </AppText>
          ) : null}
          {trip.companions.length === 0 ? (
            <AppText variant="caption" color={colors.textSecondary}>
              Solo
            </AppText>
          ) : null}
        </View>
        <View style={styles.money}>
          <AppText variant="bodyStrong">{formatEuros(trip.myShareCents)}</AppText>
          {status ? <Badge label={status.label} tone={status.tone} /> : null}
        </View>
      </View>
    </Pressable>
  );
}

function Stat({ icon, text }: { icon: 'speedometer-outline' | 'time-outline' | 'leaf-outline'; text: string }) {
  const { colors } = useTheme();
  const styles = useStyles(makeStyles);
  return (
    <View style={styles.stat}>
      <Ionicons name={icon} size={16} color={colors.primary} />
      <AppText variant="caption" color={colors.textSecondary}>
        {text}
      </AppText>
    </View>
  );
}

export const TripCard = memo(TripCardBase);

const makeStyles = (c: Palette) =>
  StyleSheet.create({
    card: {
      gap: spacing.sm + 2,
      padding: spacing.md,
      borderRadius: radius.lg,
      backgroundColor: c.surfaceRaised,
      borderWidth: 1,
      borderColor: c.border,
    },
    top: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm + 4 },
    car: { width: 92 },
    flex: { flex: 1, gap: 2 },
    stats: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md },
    stat: { flexDirection: 'row', alignItems: 'center', gap: 4 },
    bottom: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.sm },
    people: { flexDirection: 'row', alignItems: 'center' },
    avatar: { marginRight: -6, borderRadius: 16, borderWidth: 2, borderColor: c.surfaceRaised },
    money: { alignItems: 'flex-end', gap: 4 },
  });
