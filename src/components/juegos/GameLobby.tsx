import Ionicons from '@expo/vector-icons/Ionicons';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { AppText, IconTile, PressableScale } from '@/components/ui';
import { GAMES, type GameInfo } from '@/games/registry';
import { radius, spacing, useStyles, useTheme, type Palette } from '@/theme';

type Props = {
  players: number;
  starting: string | null;
  onStart: (game: GameInfo) => void;
};

/**
 * Catálogo de juegos: cada uno con su color de identidad, qué es, cuánto dura y cuántos hacen
 * falta. Si no hay gente suficiente, la tarjeta lo dice y no se puede empezar.
 */
export function GameLobby({ players, starting, onStart }: Props) {
  const { colors } = useTheme();
  const styles = useStyles(makeStyles);
  return (
    <View style={styles.list}>
      {GAMES.map((game) => {
        const enough = players >= game.minPlayers;
        const enabled = game.available && enough && starting === null;
        const accent = colors.accents[game.tint];
        const busy = starting === game.id;
        return (
          <PressableScale
            key={game.id}
            accessibilityRole="button"
            accessibilityLabel={`${game.name}. ${game.description}${enough ? '' : `. Hacen falta ${game.minPlayers} personas`}`}
            accessibilityState={{ disabled: !enabled, busy }}
            disabled={!enabled}
            onPress={() => onStart(game)}
            haptic
            scaleTo={0.98}
            style={[styles.card, !enough && styles.dimmed]}
            pressedStyle={{ borderColor: accent.solid }}
          >
            <View style={[styles.stripe, { backgroundColor: accent.solid }]} />
            <IconTile icon={game.icon} tint={game.tint} solid size={56} />
            <View style={styles.text}>
              <AppText variant="heading" numberOfLines={2}>
                {game.name}
              </AppText>
              <AppText variant="caption" color={colors.textSecondary} numberOfLines={3}>
                {game.description}
              </AppText>
              <View style={styles.chips}>
                <View style={[styles.chip, { backgroundColor: accent.soft }]}>
                  <AppText variant="caption" color={accent.text}>
                    {game.tag}
                  </AppText>
                </View>
                <View style={[styles.chip, { backgroundColor: enough ? colors.surfaceStrong : colors.dangerSoft }]}>
                  <Ionicons name="people" size={12} color={enough ? colors.textSecondary : colors.danger} />
                  <AppText variant="caption" color={enough ? colors.textSecondary : colors.danger}>
                    {enough ? `${game.minPlayers}+` : `Faltan ${game.minPlayers - players}`}
                  </AppText>
                </View>
              </View>
            </View>
            <View style={[styles.play, { backgroundColor: enough ? accent.solid : colors.surfaceStrong }]}>
              {busy ? (
                <ActivityIndicator color={colors.textOnPrimary} />
              ) : (
                <Ionicons name="play" size={20} color={enough ? colors.textOnPrimary : colors.textTertiary} />
              )}
            </View>
          </PressableScale>
        );
      })}
    </View>
  );
}

const makeStyles = (c: Palette) =>
  StyleSheet.create({
    list: { gap: spacing.sm + 4 },
    card: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.md,
      padding: spacing.md,
      paddingLeft: spacing.md + 4,
      borderRadius: radius.lg,
      backgroundColor: c.surface,
      borderWidth: 1,
      borderColor: c.border,
      overflow: 'hidden',
      minHeight: 108,
    },
    dimmed: { opacity: 0.6 },
    stripe: { position: 'absolute', left: 0, top: 0, bottom: 0, width: 4 },
    text: { flex: 1, gap: 4 },
    chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs + 2, marginTop: 2 },
    chip: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: spacing.sm, paddingVertical: 3, borderRadius: radius.pill },
    play: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  });
