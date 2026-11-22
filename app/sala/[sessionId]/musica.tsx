import { useCallback, useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { DjRoundPanel } from '@/components/musica/DjRoundPanel';
import { NowPlayingCard } from '@/components/musica/NowPlayingCard';
import { QueueList } from '@/components/musica/QueueList';
import { SearchBox } from '@/components/musica/SearchBox';
import { AppText, Badge, Button, Notice, Screen, ScreenHeader } from '@/components/ui';
import { useActiveRound } from '@/hooks/useActiveRound';
import { useDjRound } from '@/hooks/useDjRound';
import { useQueue } from '@/hooks/useQueue';
import { useSession } from '@/hooks/useSession';
import { errorMessage } from '@/lib/errors';
import { readGuessWhoPayload } from '@/lib/games/quienLaPuso';
import { vibrate } from '@/services/device/feedback';
import { addDjSong, addToQueue, removeFromQueue } from '@/services/supabase/queue';
import { spacing, useTheme } from '@/theme';
import type { YouTubeTrack } from '@/types/youtube';

const MAX_PER_PERSON = 3;

/**
 * Pestaña Música (S2-05): lo que suena, buscar y añadir canciones y la cola compartida.
 * La música suena en el móvil del conductor; aquí solo se busca, se añade y se vota.
 */
export default function MusicaScreen() {
  const { colors } = useTheme();
  const { sessionId, members, myId } = useSession();
  const { nowPlaying, upcoming, myCount, loading, error, reload } = useQueue();
  const { round } = useActiveRound();
  const dj = useDjRound();
  const myDjTurn = dj.round?.status === 'activa' && dj.state?.currentTurn?.id === myId;
  const [actionError, setActionError] = useState<string | null>(null);

  // En mi turno de DJ, la canción que añado es la de la ronda (#20).
  const djRoundId = myDjTurn ? (dj.round?.id ?? null) : null;
  const add = useCallback(
    async (track: YouTubeTrack) => {
      if (myId === null) return;
      if (djRoundId !== null) await addDjSong(djRoundId, track);
      else await addToQueue(sessionId, myId, track);
      vibrate('success');
    },
    [sessionId, myId, djRoundId],
  );

  const remove = useCallback(async (id: string) => {
    setActionError(null);
    try {
      await removeFromQueue(id);
    } catch (err) {
      setActionError(errorMessage(err));
    }
  }, []);

  // Mientras se juega a «¿Quién la ha puesto?» con esta canción, no se dice quién la puso (#22).
  const mystery =
    nowPlaying !== null &&
    round?.game === 'quien_la_puso' &&
    round.status === 'activa' &&
    readGuessWhoPayload(round.payload).queueId === nowPlaying.id;
  const addedBy = nowPlaying && !mystery ? (members.find((member) => member.user_id === nowPlaying.added_by) ?? null) : null;

  return (
    <Screen>
      <ScreenHeader eyebrow="Suena en el coche" title="Música" />

      {loading && nowPlaying === null && upcoming.length === 0 ? (
        <ActivityIndicator color={colors.primary} />
      ) : (
        <NowPlayingCard item={nowPlaying} addedBy={addedBy} mystery={mystery} members={members.length} onError={setActionError} />
      )}

      {error ? (
        <View style={styles.block}>
          <Notice message={error} />
          <Button label="Reintentar" variant="secondary" icon="refresh" onPress={() => void reload()} />
        </View>
      ) : null}
      {actionError ? <Notice message={actionError} /> : null}

      <DjRoundPanel dj={dj} />

      <View style={styles.block}>
        <View style={styles.head}>
          <AppText variant="title" accessibilityRole="header" style={styles.flex}>
            {myDjTurn ? 'Elige tu canción de DJ' : 'Añadir canción'}
          </AppText>
          <Badge label={`${myCount} de ${MAX_PER_PERSON} tuyas`} tone={myCount >= MAX_PER_PERSON ? 'primary' : 'neutral'} />
        </View>
        <SearchBox full={myCount >= MAX_PER_PERSON} onAdd={add} />
      </View>

      <View style={styles.block}>
        <View style={styles.head}>
          <AppText variant="title" accessibilityRole="header" style={styles.flex}>
            A continuación
          </AppText>
          {upcoming.length > 0 ? <Badge label={String(upcoming.length)} /> : null}
        </View>
        {upcoming.length === 0 ? (
          <AppText color={colors.textSecondary}>La cola está vacía. ¡Pon la primera!</AppText>
        ) : (
          <QueueList items={upcoming} members={members} myId={myId} onRemove={(id) => void remove(id)} />
        )}
      </View>

      <View style={styles.bottomSpace} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  block: { gap: spacing.sm + 4, marginTop: spacing.sm },
  head: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  flex: { flex: 1 },
  bottomSpace: { height: 72 },
});
