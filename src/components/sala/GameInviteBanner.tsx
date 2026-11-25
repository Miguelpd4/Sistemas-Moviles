import Ionicons from '@expo/vector-icons/Ionicons';
import { memo } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppText, Button } from '@/components/ui';
import { radius, spacing, useTheme } from '@/theme';

type Props = {
  gameName: string;
  creatorName: string;
  /** Los turnos de DJ se juegan en Música; el resto, en Juegos. */
  tab: 'juegos' | 'musica';
  onEnter: () => void;
  onDismiss: () => void;
};

/**
 * Aviso de partida nueva, arriba de cualquier pestaña de la sala. No desaparece solo: se va al
 * entrar al juego, al cerrarlo o cuando termina la ronda.
 */
function GameInviteBannerBase({ gameName, creatorName, tab, onEnter, onDismiss }: Props) {
  const { colors, elevation } = useTheme();
  const insets = useSafeAreaInsets();
  return (
    <View pointerEvents="box-none" style={[styles.wrapper, { top: insets.top + spacing.sm }]}>
      <View
        style={[styles.card, { backgroundColor: colors.surfaceRaised, borderColor: colors.primary }, elevation]}
        accessibilityRole="alert"
        accessibilityLiveRegion="assertive"
      >
        <View style={styles.row}>
          <View style={[styles.icon, { backgroundColor: colors.primarySoft }]}>
            <Ionicons name={tab === 'musica' ? 'musical-notes' : 'game-controller'} size={24} color={colors.primary} />
          </View>
          <View style={styles.text}>
            <AppText variant="heading">¡Hay una nueva partida!</AppText>
            <AppText color={colors.textSecondary}>
              {creatorName} ha iniciado {gameName}.
            </AppText>
          </View>
          <Pressable accessibilityRole="button" accessibilityLabel="Cerrar el aviso" onPress={onDismiss} hitSlop={12}>
            <Ionicons name="close" size={22} color={colors.textSecondary} />
          </Pressable>
        </View>
        <Button label={tab === 'musica' ? 'Ir a Música' : 'Entrar al juego'} icon="play" onPress={onEnter} />
      </View>
    </View>
  );
}

export const GameInviteBanner = memo(GameInviteBannerBase);

const styles = StyleSheet.create({
  wrapper: { position: 'absolute', left: spacing.md, right: spacing.md, alignItems: 'center', zIndex: 30 },
  card: { width: '100%', maxWidth: 460, gap: spacing.sm + 2, padding: spacing.md, borderRadius: radius.lg, borderWidth: 2 },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm + 2 },
  icon: { width: 44, height: 44, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center' },
  text: { flex: 1, gap: 2 },
});
