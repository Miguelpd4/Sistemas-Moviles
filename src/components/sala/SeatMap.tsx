import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import Ionicons from '@expo/vector-icons/Ionicons';
import { memo, useMemo } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { AppText, Avatar } from '@/components/ui';
import { isLightPaint, paintHex } from '@/lib/carColors';
import { seatLabel, seatLayout } from '@/lib/seats';
import { carDrawing, radius, spacing, useStyles, useTheme, type Palette } from '@/theme';

export type SeatOccupant = { name: string; avatarKind: string; avatarValue: string };

type Props = {
  seats: number;
  taken: readonly number[];
  selected?: number | null;
  onSelect?: (seat: number) => void;
  /** Para la sala: quién va sentado en cada asiento. */
  occupants?: Readonly<Record<number, SeatOccupant>>;
  /** Color de la carrocería (clave de src/lib/carColors.ts). */
  paint?: string | null;
};

const SEAT_SIZE = 74;

type SeatProps = {
  seat: number;
  taken: boolean;
  selected: boolean;
  occupant: SeatOccupant | undefined;
  onSelect: ((seat: number) => void) | undefined;
};

const Seat = memo(function Seat({ seat, taken, selected, occupant, onSelect }: SeatProps) {
  const { colors } = useTheme();
  const styles = useStyles(makeStyles);
  const isDriver = seat === 1;
  const disabled = isDriver || taken || onSelect === undefined;
  const state = isDriver ? 'del conductor' : taken ? 'ocupado' : selected ? 'elegido' : 'libre';
  const name = occupant ? `, ${occupant.name}` : '';
  const free = !isDriver && !taken && !selected;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${seatLabel(seat)}, ${state}${name}`}
      accessibilityState={{ disabled, selected }}
      disabled={disabled}
      onPress={() => onSelect?.(seat)}
      style={({ pressed }) => [
        styles.seat,
        free && styles.seatFree,
        (taken || isDriver) && styles.seatTaken,
        selected && styles.seatSelected,
        pressed && free && styles.seatPressed,
      ]}
    >
      <View style={[styles.headrest, selected && styles.headrestSelected]} />
      {occupant ? (
        <Avatar kind={occupant.avatarKind} value={occupant.avatarValue} size={38} />
      ) : isDriver ? (
        <MaterialCommunityIcons name="steering" size={30} color={colors.textSecondary} />
      ) : selected ? (
        <Ionicons name="checkmark" size={30} color={colors.textOnPrimary} />
      ) : taken ? (
        <Ionicons name="person" size={24} color={colors.textTertiary} />
      ) : (
        <AppText variant="heading" color={colors.text}>
          {seat}
        </AppText>
      )}
      <AppText
        variant="caption"
        numberOfLines={1}
        style={styles.seatName}
        color={selected ? colors.textOnPrimary : colors.textSecondary}
      >
        {occupant ? occupant.name : isDriver ? 'Conductor' : selected ? 'Tú' : taken ? 'Ocupado' : 'Libre'}
      </AppText>
    </Pressable>
  );
});

/** El coche visto desde arriba, pintado de su color, con sus asientos. */
function SeatMapBase({ seats, taken, selected = null, onSelect, occupants, paint = null }: Props) {
  const styles = useStyles(makeStyles);
  const rows = useMemo(() => seatLayout(seats), [seats]);
  const body = paintHex(paint);
  const light = isLightPaint(paint);

  return (
    <View
      style={[styles.car, { backgroundColor: body }, light && styles.carLight]}
      accessibilityLabel={`Coche de ${seats} plazas visto desde arriba`}
    >
      <View style={styles.lights}>
        <View style={styles.headlight} />
        <View style={styles.headlight} />
      </View>
      <View style={[styles.glass, styles.windshield, { backgroundColor: light ? carDrawing.glassOnLight : carDrawing.glassOnDark }]} />
      <View style={styles.cabin}>
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
      <View style={[styles.glass, styles.rearWindow, { backgroundColor: light ? carDrawing.glassOnLight : carDrawing.glassOnDark }]} />
      <View style={styles.lights}>
        <View style={styles.taillight} />
        <View style={styles.taillight} />
      </View>
    </View>
  );
}

/** Leyenda de los estados de los asientos. */
export function SeatLegend() {
  const styles = useStyles(makeStyles);
  return (
    <View style={styles.legend} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      <LegendItem style={styles.seatFree} label="Libre" />
      <LegendItem style={styles.seatSelected} label="El tuyo" />
      <LegendItem style={styles.seatTaken} label="Ocupado" />
    </View>
  );
}

function LegendItem({ style, label }: { style: object; label: string }) {
  const { colors } = useTheme();
  const styles = useStyles(makeStyles);
  return (
    <View style={styles.legendItem}>
      <View style={[styles.legendSwatch, style]} />
      <AppText variant="caption" color={colors.textSecondary}>
        {label}
      </AppText>
    </View>
  );
}

const makeStyles = (colors: Palette) =>
  StyleSheet.create({
  car: {
    alignSelf: 'center',
    borderTopLeftRadius: 72,
    borderTopRightRadius: 72,
    borderBottomLeftRadius: 44,
    borderBottomRightRadius: 44,
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
    gap: spacing.sm,
    minWidth: 268,
  },
  carLight: { borderWidth: 1.5, borderColor: colors.borderStrong },
  lights: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: spacing.md },
  headlight: { width: 34, height: 8, borderRadius: 4, backgroundColor: carDrawing.headlight },
  taillight: { width: 30, height: 6, borderRadius: 3, backgroundColor: carDrawing.taillight },
  glass: { marginHorizontal: spacing.lg, opacity: 0.85 },
  windshield: { height: 30, borderTopLeftRadius: radius.lg, borderTopRightRadius: radius.lg, borderRadius: 6 },
  rearWindow: { height: 18, borderBottomLeftRadius: radius.md, borderBottomRightRadius: radius.md, borderRadius: 6 },
  cabin: {
    backgroundColor: colors.cabin,
    borderRadius: radius.md,
    padding: spacing.sm,
    gap: spacing.sm,
  },
  row: { flexDirection: 'row', justifyContent: 'space-between', gap: spacing.sm },
  seat: {
    width: SEAT_SIZE,
    minHeight: SEAT_SIZE + 10,
    borderRadius: radius.sm,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xs,
    paddingTop: spacing.sm,
    gap: 2,
  },
  seatFree: { backgroundColor: colors.surfaceStrong, borderColor: colors.borderStrong },
  seatPressed: { borderColor: colors.primary },
  seatTaken: { backgroundColor: colors.surface, borderColor: colors.border },
  seatSelected: { backgroundColor: colors.primary, borderColor: colors.primaryPressed },
  headrest: {
    position: 'absolute',
    top: 5,
    width: 26,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.borderStrong,
  },
  headrestSelected: { backgroundColor: colors.primaryPressed },
  seatName: { maxWidth: SEAT_SIZE - 8, fontSize: 12, lineHeight: 15 },
  legend: { flexDirection: 'row', justifyContent: 'center', gap: spacing.lg },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  legendSwatch: { width: 16, height: 16, borderRadius: 4, borderWidth: 2 },
  });

export const SeatMap = memo(SeatMapBase);
