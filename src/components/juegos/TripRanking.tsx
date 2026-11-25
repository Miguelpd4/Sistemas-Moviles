import Ionicons from '@expo/vector-icons/Ionicons';
import { memo } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { AppText, Avatar, Glow, Notice } from '@/components/ui';
import { joinNames, medal, type Standings } from '@/lib/ranking';
import { radius, spacing, useStyles, useTheme, type Palette } from '@/theme';

type Props = {
  standings: Standings | null;
  error: string | null;
  /** Al terminar el viaje: «Ganador del viaje» en vez de «Va ganando». */
  final?: boolean;
};

/**
 * Clasificación general del viaje (#33): quien va ganando (o quienes, si hay empate) y todos los
 * del coche con sus puntos acumulados en todas las partidas, también con 0.
 */
function TripRankingBase({ standings, error, final = false }: Props) {
  const { colors } = useTheme();
  const styles = useStyles(makeStyles);
  const leaders = standings?.winners ?? [];
  const leader = leaders[0];

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <Ionicons name="trophy" size={22} color={colors.primary} />
        <AppText variant="heading" accessibilityRole="header" style={styles.flex}>
          {final ? 'Ranking final de juegos' : 'Clasificación del viaje'}
        </AppText>
      </View>
      {error ? <Notice message={error} /> : null}
      {standings === null ? (
        error ? null : <ActivityIndicator color={colors.primary} />
      ) : !standings.anyPoints ? (
        <AppText color={colors.textSecondary}>
          {final ? 'En este viaje nadie sumó puntos en los juegos.' : 'Nadie ha puntuado todavía. ¡Empezad una partida y a por el primer puesto!'}
        </AppText>
      ) : leader ? (
        <View
          style={styles.hero}
          accessible
          accessibilityLabel={`${leaders.length > 1 ? 'Empate en cabeza' : final ? 'Ganador del viaje' : 'Va ganando'}: ${joinNames(leaders.map((r) => r.name))}, ${leader.points} puntos`}
        >
          <Glow cy={0.4} />
          <View style={styles.podium}>
            {leaders.slice(0, 3).map((row) => (
              <View key={row.userId} style={styles.ring}>
                <Avatar kind={row.avatarKind} value={row.avatarValue} size={leaders.length > 1 ? 56 : 72} label={row.name} />
              </View>
            ))}
          </View>
          <AppText variant="label" color={colors.primaryText}>
            {leaders.length > 1 ? '¡Empate en cabeza!' : final ? '🏆 Ganador del viaje' : 'Va ganando'}
          </AppText>
          <AppText variant="title" style={styles.center}>
            {joinNames(leaders.map((row) => row.name))}
          </AppText>
          <AppText color={colors.textSecondary}>{leader.points} puntos</AppText>
        </View>
      ) : null}

      {standings && standings.rows.length > 0 ? (
        <View style={styles.list}>
          {standings.rows.map((row) => (
            <View
              key={row.userId}
              style={[styles.row, row.winner && styles.rowWinner]}
              accessible
              accessibilityLabel={`Puesto ${row.position}${row.tied ? ', empate' : ''}: ${row.name}, ${row.points} puntos`}
            >
              <AppText variant="heading" style={styles.position}>
                {medal(row.position) ?? `${row.position}º`}
              </AppText>
              <Avatar kind={row.avatarKind} value={row.avatarValue} size={36} />
              <View style={styles.flex}>
                <AppText variant="bodyStrong" numberOfLines={1}>
                  {row.name}
                </AppText>
                <AppText variant="caption" color={colors.textSecondary}>
                  {row.tied && row.points > 0 ? 'Empate · ' : ''}
                  {row.roundsWon === 1 ? '1 ronda con puntos' : `${row.roundsWon} rondas con puntos`}
                </AppText>
              </View>
              <AppText variant="heading" color={row.winner ? colors.primaryText : colors.text}>
                {row.points}
              </AppText>
            </View>
          ))}
        </View>
      ) : null}
    </View>
  );
}

export const TripRanking = memo(TripRankingBase);

const makeStyles = (c: Palette) =>
  StyleSheet.create({
    card: { gap: spacing.sm + 4, padding: spacing.md, borderRadius: radius.lg, backgroundColor: c.surfaceRaised, borderWidth: 1, borderColor: c.border },
    header: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
    flex: { flex: 1 },
    center: { textAlign: 'center' },
    hero: { alignItems: 'center', gap: 2, paddingVertical: spacing.md, borderRadius: radius.lg, overflow: 'hidden', backgroundColor: c.surface },
    podium: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.xs },
    ring: { padding: 3, borderRadius: 999, borderWidth: 2, borderColor: c.primary },
    list: { gap: spacing.xs + 2 },
    row: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm + 2, padding: spacing.sm + 2, borderRadius: radius.md, backgroundColor: c.surface },
    rowWinner: { backgroundColor: c.primarySoft, borderWidth: 1, borderColor: c.primary },
    position: { minWidth: 34, textAlign: 'center' },
  });
