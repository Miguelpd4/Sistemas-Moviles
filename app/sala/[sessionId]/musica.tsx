import { useCallback, useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { NowPlayingCard } from '@/components/musica/NowPlayingCard';
import { QueueList } from '@/components/musica/QueueList';
import { SearchBox } from '@/components/musica/SearchBox';
import { AppText, Badge, Button, Notice, Screen, ScreenHeader } from '@/components/ui';
import { useQueue } from '@/hooks/useQueue';
import { useSession } from '@/hooks/useSession';
import { errorMessage } from '@/lib/errors';
import { vibrate } from '@/services/device/feedback';
import { addToQueue, removeFromQueue } from '@/services/supabase/queue';
import { spacing, useTheme } from '@/theme';
import type { SpotifyTrack } from '@/types/spotify';

const MAX_PER_PERSON = 3;

/**
 * Pestaña Música (S2-05): lo que suena, buscar y añadir canciones y la cola compartida.
 * La música suena en el móvil del conductor; aquí solo se busca, se añade y se vota.
 */
export default function MusicaScreen() {
  const { colors } = useTheme();
  const { sessionId, members, myId } = useSession();
  const { nowPlaying, upcoming, myCount, loading, error, reload } = useQueue();
  const [actionError, setActionError] = useState<string | null>(null);

  const add = useCallback(
    async (track: SpotifyTrack) => {
      if (myId === null) return;
      await addToQueue(sessionId, myId, track);
      vibrate('success');
    },
    [sessionId, myId],
  );

  const remove = useCallback(async (id: string) => {
    setActionError(null);
    try {
      await removeFromQueue(id);
    } catch (err) {
      setActionError(errorMessage(err));
    }
  }, []);

  const addedBy = nowPlaying ? (members.find((member) => member.user_id === nowPlaying.added_by) ?? null) : null;

  return (
    <Screen>
      <ScreenHeader eyebrow="Suena en el coche" title="Música" />

      {loading && nowPlaying === null && upcoming.length === 0 ? (
        <ActivityIndicator color={colors.primary} />
      ) : (
        <NowPlayingCard item={nowPlaying} addedBy={addedBy} members={members.length} onError={setActionError} />
      )}

      {error ? (
        <View style={styles.block}>
          <Notice message={error} />
          <Button label="Reintentar" variant="secondary" icon="refresh" onPress={() => void reload()} />
        </View>
      ) : null}
      {actionError ? <Notice message={actionError} /> : null}

      <View style={styles.block}>
        <View style={styles.head}>
          <AppText variant="title" accessibilityRole="header" style={styles.flex}>
            Añadir canción
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
