import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { memo, useMemo } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { AppText, Avatar } from '@/components/ui';
import { seatLabel, seatLayout } from '@/lib/seats';
import { colors, radius, spacing } from '@/theme';

export type SeatOccupant = { name: string; avatarKind: string; avatarValue: string };

type Props = {
  seats: number;
  taken: readonly number[];
  selected?: number | null;
  onSelect?: (seat: number) => void;
  /** Para la sala: quién va sentado en cada asiento. */
  occupants?: Readonly<Record<number, SeatOccupant>>;
};

const SEAT_SIZE = 72;

type SeatProps = {
  seat: number;
  taken: boolean;
  selected: boolean;
  occupant: SeatOccupant | undefined;
  onSelect: ((seat: number) => void) | undefined;
};

const Seat = memo(function Seat({ seat, taken, selected, occupant, onSelect }: SeatProps) {
  const isDriver = seat === 1;
  const disabled = isDriver || taken || onSelect === undefined;
  const state = isDriver ? 'del conductor' : taken ? 'ocupado' : selected ? 'elegido' : 'libre';
  const name = occupant ? `, ${occupant.name}` : '';

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${seatLabel(seat)}, ${state}${name}`}
      accessibilityState={{ disabled, selected }}
      disabled={disabled}
      onPress={() => onSelect?.(seat)}
      style={[
        styles.seat,
        taken && styles.seatTaken,
        selected && styles.seatSelected,
        isDriver && styles.seatDriver,
      ]}
    >
      {occupant ? (
        <Avatar kind={occupant.avatarKind} value={occupant.avatarValue} size={40} />
      ) : isDriver ? (
        <MaterialCommunityIcons name="steering" size={30} color={colors.textSecondary} />
      ) : (
        <AppText variant="heading" color={selected ? colors.textOnPrimary : colors.text}>
          {seat}
        </AppText>
      )}
      {occupant ? (
        <AppText variant="caption" numberOfLines={1} style={styles.occupantName}>
          {occupant.name}
        </AppText>
      ) : null}
    </Pressable>
  );
});

/** Coche visto desde arriba con sus asientos. */
function SeatMapBase({ seats, taken, selected = null, onSelect, occupants }: Props) {
  const rows = useMemo(() => seatLayout(seats), [seats]);

  return (
    <View style={styles.car} accessibilityLabel={`Coche de ${seats} plazas`}>
      <View style={styles.windshield} />
      {rows.map((row) => (
        <View key={row.join('-')} style={styles.row}>
          {row.map((seat) => (
            <Seat
              key={seat}
              seat={seat}
              taken={taken.includes(seat)}
              selected={selected === seat}
              occupant={occupants?.[seat]}
              onSelect={onSelect}
            />
          ))}
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  car: {
    alignSelf: 'center',
    backgroundColor: colors.surfaceStrong,
    borderRadius: radius.lg * 2,
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.lg,
    gap: spacing.md,
    minWidth: 260,
  },
  windshield: {
    height: 28,
    marginHorizontal: spacing.lg,
    marginTop: spacing.md,
    borderTopLeftRadius: radius.md,
    borderTopRightRadius: radius.md,
    backgroundColor: colors.border,
  },
  row: { flexDirection: 'row', justifyContent: 'space-between', gap: spacing.md },
  seat: {
    width: SEAT_SIZE,
    minHeight: SEAT_SIZE,
    borderRadius: radius.sm,
    backgroundColor: colors.background,
    borderWidth: 2,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xs,
  },
  seatTaken: { backgroundColor: colors.surface, borderColor: colors.surface },
  seatSelected: { backgroundColor: colors.primary, borderColor: colors.primary },
  seatDriver: { backgroundColor: colors.surface, borderColor: colors.surface },
  occupantName: { maxWidth: SEAT_SIZE - 8 },
});

export const SeatMap = memo(SeatMapBase);
