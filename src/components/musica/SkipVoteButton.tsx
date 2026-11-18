import Ionicons from '@expo/vector-icons/Ionicons';
import { useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';

import { AppText } from '@/components/ui';
import { useSkipVotes } from '@/hooks/useSkipVotes';
import { errorMessage } from '@/lib/errors';
import { votesNeeded } from '@/lib/queue';
import { vibrate } from '@/services/device/feedback';
import { voteSkip } from '@/services/supabase/queue';
import { radius, spacing, useTheme } from '@/theme';

type Props = { queueId: string; members: number; onError: (message: string) => void };

/** «Saltar» con el recuento de votos (S2-07). Más de la mitad la salta. */
export function SkipVoteButton({ queueId, members, onError }: Props) {
  const { colors } = useTheme();
  const { votes, voted, addMine } = useSkipVotes(queueId);
  const [needed, setNeeded] = useState<number | null>(null);
  const [sending, setSending] = useState(false);
  const required = needed ?? votesNeeded(members);

  const vote = async () => {
    vibrate();
    setSending(true);
    try {
      const result = await voteSkip(queueId);
      setNeeded(result.needed);
      addMine();
    } catch (err) {
      onError(errorMessage(err));
    } finally {
      setSending(false);
    }
  };

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={voted ? `Has votado saltar. ${votes} de ${required} votos` : `Votar saltar. ${votes} de ${required} votos`}
      accessibilityState={{ disabled: voted || sending, selected: voted }}
      disabled={voted || sending}
      onPress={() => void vote()}
      style={({ pressed }) => [
        styles.button,
        { backgroundColor: voted ? colors.primarySoft : pressed ? colors.surfaceStrong : colors.surface, borderColor: voted ? colors.primary : colors.border },
      ]}
    >
      {sending ? <ActivityIndicator color={colors.primary} /> : <Ionicons name="play-skip-forward" size={20} color={voted ? colors.primary : colors.text} />}
      <AppText variant="bodyStrong" color={voted ? colors.primaryText : colors.text}>
        {voted ? 'Votado' : 'Saltar'}
      </AppText>
      <View style={[styles.count, { backgroundColor: voted ? colors.primary : colors.surfaceStrong }]}>
        <AppText variant="caption" color={voted ? colors.textOnPrimary : colors.textSecondary}>
          {votes} de {required}
        </AppText>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    minHeight: 48,
    paddingLeft: spacing.md,
    paddingRight: 6,
    borderRadius: radius.pill,
    borderWidth: 1.5,
    alignSelf: 'flex-start',
  },
  count: { paddingHorizontal: spacing.sm + 2, paddingVertical: 6, borderRadius: radius.pill },
});
