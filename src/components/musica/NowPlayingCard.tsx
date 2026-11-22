import Ionicons from '@expo/vector-icons/Ionicons';
import { StyleSheet, View } from 'react-native';

import { AppText, Avatar, Glow } from '@/components/ui';
import { useNowPlaying } from '@/hooks/useNowPlaying';
import type { QueueRow } from '@/services/supabase/queue';
import { radius, spacing, useStyles, useTheme, type Palette } from '@/theme';
import type { SessionMember } from '@/types/session';

import { AlbumArt } from './AlbumArt';
import { MusicControls } from './MusicControls';
import { SkipVoteButton } from './SkipVoteButton';

type Props = {
  item: QueueRow | null;
  addedBy: SessionMember | null;
  /** Se está jugando a «¿Quién la ha puesto?» con esta canción: no se dice quién la puso. */
  mystery?: boolean;
  members: number;
  onError: (message: string) => void;
  /** Conductor o copiloto (#60): principio, pausa o seguir y siguiente. null para los pasajeros. */
  controls?: {
    onRestart: () => void;
    onTogglePlay: (isPlaying: boolean) => void;
    onNext: () => Promise<void>;
  } | null;
};

const clock = (ms: number) => {
  const total = Math.max(0, Math.floor(ms / 1000));
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, '0')}`;
};

/** Lo que suena ahora: carátula grande, quién la puso, barra de progreso y votar para saltar. */
export function NowPlayingCard({ item, addedBy, mystery = false, members, onError, controls = null }: Props) {
  const { colors } = useTheme();
  const styles = useStyles(makeStyles);
  const { progressMs, durationMs, isPlaying, known } = useNowPlaying(item?.id ?? null, item?.duration_ms ?? 0);

  if (item === null) {
    return (
      <View style={styles.card}>
        <Glow cy={0.1} />
        <View style={styles.emptyIcon}>
          <Ionicons name="musical-notes" size={34} color={colors.primary} />
        </View>
        <AppText variant="title">Aún no suena nada</AppText>
        <AppText color={colors.textSecondary}>
          Busca una canción y añádela. Sonará en el móvil del conductor en cuanto haya cola.
        </AppText>
      </View>
    );
  }

  const percent = durationMs > 0 ? Math.min(100, (progressMs / durationMs) * 100) : 0;

  return (
    <View style={styles.card}>
      <Glow cy={0.35} />
      <View style={styles.top}>
        <AlbumArt url={item.album_art_url} size={112} radius={radius.md} />
        <View style={styles.info}>
          <View style={styles.live}>
            <View style={[styles.liveDot, { backgroundColor: colors.success }]} />
            <AppText variant="label" color={colors.success}>
              Ahora suena
            </AppText>
          </View>
          <AppText variant="title" numberOfLines={2}>
            {item.title}
          </AppText>
          <AppText color={colors.textSecondary} numberOfLines={1}>
            {item.artist}
          </AppText>
        </View>
      </View>

      <View
        style={styles.progressBlock}
        accessible
        accessibilityRole="progressbar"
        accessibilityLabel={`Va por ${clock(progressMs)} de ${clock(durationMs)}`}
      >
        <View style={[styles.track, { backgroundColor: colors.surfaceStrong }]}>
          <View style={[styles.fill, { width: `${percent}%`, backgroundColor: colors.primary }]} />
        </View>
        <View style={styles.times}>
          <AppText variant="caption" color={colors.textTertiary}>
            {clock(progressMs)}
          </AppText>
          <AppText variant="caption" color={colors.textTertiary}>
            {clock(durationMs)}
          </AppText>
        </View>
      </View>

      {controls ? (
        <MusicControls
          // Hasta que llegue el primer aviso del Modo conductor, se supone que suena.
          isPlaying={known ? isPlaying : true}
          onRestart={controls.onRestart}
          onTogglePlay={controls.onTogglePlay}
          onNext={controls.onNext}
        />
      ) : null}

      <View style={styles.bottom}>
        {mystery ? (
          <View style={styles.who}>
            <Ionicons name="help-circle" size={28} color={colors.primary} />
            <AppText variant="caption" color={colors.textSecondary} numberOfLines={2} style={styles.whoText}>
              ¿Quién la ha puesto? Adivínalo en Juegos
            </AppText>
          </View>
        ) : addedBy ? (
          <View style={styles.who}>
            <Avatar kind={addedBy.avatar_kind} value={addedBy.avatar_value} size={28} />
            <AppText variant="caption" color={colors.textSecondary} numberOfLines={1} style={styles.whoText}>
              La puso {addedBy.display_name}
            </AppText>
          </View>
        ) : (
          <View style={styles.who} />
        )}
        <SkipVoteButton queueId={item.id} members={members} onError={onError} />
      </View>
    </View>
  );
}

const makeStyles = (c: Palette) =>
  StyleSheet.create({
    card: {
      gap: spacing.md,
      padding: spacing.md + 2,
      borderRadius: radius.lg,
      backgroundColor: c.surfaceRaised,
      borderWidth: 1,
      borderColor: c.border,
      overflow: 'hidden',
    },
    emptyIcon: {
      width: 64,
      height: 64,
      borderRadius: 32,
      backgroundColor: c.primarySoft,
      alignItems: 'center',
      justifyContent: 'center',
    },
    top: { flexDirection: 'row', gap: spacing.md, alignItems: 'center' },
    info: { flex: 1, gap: 2 },
    live: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    liveDot: { width: 8, height: 8, borderRadius: 4 },
    progressBlock: { gap: 4 },
    track: { height: 6, borderRadius: 3, overflow: 'hidden' },
    fill: { height: 6, borderRadius: 3 },
    times: { flexDirection: 'row', justifyContent: 'space-between' },
    bottom: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
    who: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
    whoText: { flexShrink: 1 },
  });
