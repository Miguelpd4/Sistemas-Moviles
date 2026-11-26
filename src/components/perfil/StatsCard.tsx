import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import type { ComponentProps } from 'react';
import { StyleSheet, View } from 'react-native';

import { AppText, StatTile } from '@/components/ui';
import { gameInfo } from '@/games/registry';
import { formatDuration, formatEuros, formatKm } from '@/lib/format';
import type { HistoryTotals } from '@/lib/history';
import type { MyStats } from '@/lib/stats';
import { radius, spacing, useStyles, useTheme, type Palette } from '@/theme';

type MciName = ComponentProps<typeof MaterialCommunityIcons>['name'];

type Props = { totals: HistoryTotals; stats: MyStats };

/** Estadísticas del Perfil (#34): viajes, papeles, coche y viaje favoritos, juegos y música. */
export function StatsCard({ totals, stats }: Props) {
  const { colors } = useTheme();
  const styles = useStyles(makeStyles);
  const favouriteGame = stats.games.favourite ? (gameInfo(stats.games.favourite)?.name ?? stats.games.favourite) : null;

  return (
    <View style={styles.section}>
      <View>
        <AppText variant="overline" color={colors.primaryText}>
          De todos tus viajes
        </AppText>
        <AppText variant="title" accessibilityRole="header">
          Tus estadísticas
        </AppText>
      </View>

      <View style={styles.grid}>
        <StatTile icon="car-multiple" tint="primary" label="Viajes" value={String(totals.trips)} />
        <StatTile icon="map-marker-distance" tint="blue" label="Kilómetros" value={formatKm(totals.distanceM)} />
        <StatTile icon="timer-outline" tint="violet" label="En la carretera" value={formatDuration(totals.durationS)} />
        <StatTile icon="leaf" tint="green" label="CO₂ ahorrado" value={`${totals.co2SavedKg.toLocaleString('es-ES')} kg`} />
        <StatTile icon="cash-multiple" tint="amber" label="Has gastado" value={formatEuros(totals.spentCents)} />
        <StatTile icon="trophy-outline" tint="pink" label="Puntos en juegos" value={String(stats.games.points)} />
      </View>

      <View style={styles.list}>
        <Line icon="steering" text={`Conductor ${stats.roles.conductor} · copiloto ${stats.roles.copiloto} · pasajero ${stats.roles.pasajero}`} />
        {totals.topCompanion ? (
          <Line icon="account-heart-outline" text={`Con quien más viajas: ${totals.topCompanion.name} (${totals.topCompanion.trips} viajes)`} />
        ) : null}
        {stats.favouriteCar ? (
          <Line icon="car-side" text={`Tu coche favorito: ${stats.favouriteCar.name} (${stats.favouriteCar.trips} viajes)`} />
        ) : null}
        {stats.longestTrip ? (
          <Line icon="map-marker-path" text={`Tu viaje más largo: ${stats.longestTrip.title}, ${formatKm(stats.longestTrip.distanceM)}`} />
        ) : null}
        <Line
          icon="gamepad-variant-outline"
          text={
            stats.games.played > 0
              ? `${stats.games.played} rondas jugadas, ${stats.games.won} ganadas${favouriteGame ? ` · tu juego favorito: ${favouriteGame}` : ''}`
              : 'Aún no has jugado: prueba en la pestaña Juegos del próximo viaje'
          }
        />
        <Line
          icon="music-note-outline"
          text={
            stats.music.songs > 0
              ? `${stats.music.songs} ${stats.music.songs === 1 ? 'canción puesta' : 'canciones puestas'}${
                  stats.music.topArtist ? ` · lo que más pones: ${stats.music.topArtist.name}` : ''
                }`
              : 'Aún no has puesto música en ningún viaje'
          }
        />
      </View>
    </View>
  );
}

function Line({ icon, text }: { icon: MciName; text: string }) {
  const { colors } = useTheme();
  const styles = useStyles(makeStyles);
  return (
    <View style={styles.line}>
      <MaterialCommunityIcons name={icon} size={20} color={colors.primary} />
      <AppText style={styles.flex} color={colors.textSecondary}>
        {text}
      </AppText>
    </View>
  );
}

const makeStyles = (c: Palette) =>
  StyleSheet.create({
    section: { gap: spacing.md, padding: spacing.md + 4, borderRadius: radius.lg, backgroundColor: c.surfaceRaised, borderWidth: 1, borderColor: c.border },
    grid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm + 4 },
    list: { gap: spacing.sm },
    line: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm },
    flex: { flex: 1 },
  });
