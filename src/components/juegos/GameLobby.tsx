import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { Pressable, StyleSheet, View } from 'react-native';

import { AppText, Badge } from '@/components/ui';
import { GAMES, type GameInfo } from '@/games/registry';
import { radius, spacing, useTheme } from '@/theme';

type Props = {
  players: number;
  starting: string | null;
  onStart: (game: GameInfo) => void;
};

/** Tarjetas de los juegos. Los que aún no existen salen como «Próximamente». */
export function GameLobby({ players, starting, onStart }: Props) {
  const { colors } = useTheme();
  return (
    <View style={styles.list}>
      {GAMES.map((game) => {
        const enough = players >= game.minPlayers;
        const enabled = game.available && enough && starting === null;
        const featured = game.available;
        return (
          <Pressable
            key={game.id}
            accessibilityRole="button"
            accessibilityLabel={`${game.name}. ${game.description}${game.available ? '' : '. Próximamente'}`}
            accessibilityState={{ disabled: !enabled, busy: starting === game.id }}
            disabled={!enabled}
            onPress={() => onStart(game)}
            style={({ pressed }) => [
              styles.card,
              featured
                ? { backgroundColor: pressed ? colors.primaryPressed : colors.primary }
                : { backgroundColor: colors.surface, opacity: 0.75 },
            ]}
          >
            <View style={[styles.icon, { backgroundColor: featured ? colors.primaryPressed : colors.surfaceStrong }]}>
              <MaterialCommunityIcons name={game.icon} size={30} color={featured ? colors.textOnPrimary : colors.textSecondary} />
            </View>
            <View style={styles.text}>
              <AppText variant="heading" color={featured ? colors.textOnPrimary : colors.text}>
                {game.name}
              </AppText>
              <AppText variant="caption" color={featured ? colors.textOnPrimary : colors.textSecondary}>
                {game.available && !enough ? `Hacen falta ${game.minPlayers} personas en el coche.` : game.description}
              </AppText>
            </View>
            {game.available ? (
              <MaterialCommunityIcons name={starting === game.id ? 'loading' : 'play-circle'} size={36} color={colors.textOnPrimary} />
            ) : (
              <Badge label="Próximamente" />
            )}
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  list: { gap: spacing.sm + 4 },
  card: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, padding: spacing.md, borderRadius: radius.lg, minHeight: 96 },
  icon: { width: 56, height: 56, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center' },
  text: { flex: 1, gap: 2 },
});
