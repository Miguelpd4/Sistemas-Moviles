import Ionicons from '@expo/vector-icons/Ionicons';
import { memo } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { AlbumArt } from '@/components/musica/AlbumArt';
import { AppText, Avatar, Glow, Notice } from '@/components/ui';
import { useTripWrapped } from '@/hooks/useTripWrapped';
import { joinNames } from '@/lib/ranking';
import { listenedMinutes, type Wrapped } from '@/lib/wrapped';
import { fonts, radius, spacing, useStyles, useTheme, type Palette } from '@/theme';

import { Appear } from './Appear';

export type WrappedPerson = { name: string; avatarKind: string; avatarValue: string };

type Props = {
  sessionId: string;
  /** Los del viaje, para el DJ (también quien se bajó antes). */
  people: ReadonlyMap<string, WrappedPerson>;
};

/**
 * COPI WRAPPED (#35): la banda sonora del viaje en tarjetas que se recorren hacia abajo:
 * portada con los números, la canción número uno, el top 5, el artista favorito y el DJ.
 * Solo cuenta la música de este viaje que sonó de verdad.
 */
export function TripWrapped({ sessionId, people }: Props) {
  const { colors } = useTheme();
  const styles = useStyles(makeStyles);
  const { wrapped, error } = useTripWrapped(sessionId);

  if (error) return <Notice message={error} />;
  if (wrapped === null) return <ActivityIndicator color={colors.primary} />;
  if (wrapped.plays === 0) {
    return (
      <View style={styles.cover}>
        <Glow cy={0.2} />
        <AppText variant="label" color={colors.primaryText} style={styles.kicker}>
          COPI WRAPPED
        </AppText>
        <AppText variant="title">Este viaje fue en silencio</AppText>
        <AppText color={colors.textSecondary}>
          {wrapped.skipped > 0
            ? 'Sonó algo, pero ninguna canción llegó al final. La próxima vez, ¡dejadlas sonar!'
            : 'No llegó a sonar ninguna canción. En el próximo viaje, poned música desde la pestaña Música.'}
        </AppText>
      </View>
    );
  }
  return <WrappedCards wrapped={wrapped} people={people} />;
}

function WrappedCardsBase({ wrapped, people }: { wrapped: Wrapped; people: ReadonlyMap<string, WrappedPerson> }) {
  const { colors } = useTheme();
  const styles = useStyles(makeStyles);
  const top = wrapped.topTracks[0];
  const minutes = listenedMinutes(wrapped.listenedMs);
  const djs = wrapped.dj ? wrapped.dj.userIds.map((id) => people.get(id)).filter((p): p is WrappedPerson => p !== undefined) : [];

  return (
    <View style={styles.stack}>
      {/* A · Portada */}
      <Appear>
        <View style={styles.cover} accessible accessibilityLabel={`COPI Wrapped. ${wrapped.plays} canciones, ${wrapped.artists} artistas`}>
          <Glow cy={0.15} />
          <AppText variant="label" color={colors.primaryText} style={styles.kicker}>
            COPI WRAPPED
          </AppText>
          <AppText style={styles.coverTitle}>La banda sonora de vuestro viaje</AppText>
          <AppText color={colors.textSecondary}>Este viaje ha tenido su propia banda sonora.</AppText>
          <View style={styles.bigStats}>
            <BigStat value={String(wrapped.plays)} label={wrapped.plays === 1 ? 'canción' : 'canciones'} />
            <BigStat value={minutes === null ? '—' : String(minutes)} label="min aprox." />
            <BigStat value={String(wrapped.artists)} label={wrapped.artists === 1 ? 'artista' : 'artistas'} />
          </View>
          {top ? (
            <AppText variant="label" color={colors.textSecondary}>
              La más escuchada: {top.title}
            </AppText>
          ) : null}
          <AppText variant="caption" color={colors.textTertiary}>
            Cuentan las canciones que sonaron enteras{wrapped.skipped > 0 ? ` (y ${wrapped.skipped} saltada${wrapped.skipped === 1 ? '' : 's'} aparte)` : ''}. Los minutos
            son aproximados: no se guardan las pausas.
          </AppText>
        </View>
      </Appear>

      {/* B · Canción número uno */}
      {top ? (
        <Appear delay={120}>
          <View style={styles.number1} accessible accessibilityLabel={`Canción del viaje: ${top.title}, de ${top.artist}. Sonó ${top.plays} veces`}>
            <Glow cy={0.35} />
            <AppText variant="label" color={colors.primaryText} style={styles.kicker}>
              LA CANCIÓN DEL VIAJE
            </AppText>
            <View style={styles.art}>
              <AlbumArt url={top.albumArtUrl} size={220} radius={radius.lg} />
              <View style={[styles.badge1, { backgroundColor: colors.primary }]}>
                <AppText style={styles.badge1Text} color={colors.textOnPrimary}>
                  #1
                </AppText>
              </View>
            </View>
            <AppText variant="display" style={styles.center} numberOfLines={2}>
              {top.title}
            </AppText>
            <AppText variant="heading" color={colors.textSecondary} style={styles.center}>
              {top.artist}
            </AppText>
            <AppText variant="bodyStrong" color={colors.primaryText}>
              Sonó {top.plays === 1 ? '1 vez' : `${top.plays} veces`}
            </AppText>
          </View>
        </Appear>
      ) : null}

      {/* C · Top 5 */}
      {wrapped.topTracks.length > 1 ? (
        <Appear delay={240}>
          <View style={styles.card}>
            <AppText variant="title">Top {wrapped.topTracks.length} del viaje</AppText>
            {wrapped.topTracks.map((track, index) => (
              <View
                key={track.trackId}
                style={styles.trackRow}
                accessible
                accessibilityLabel={`${index + 1}: ${track.title}, de ${track.artist}, ${track.plays} reproducciones`}
              >
                <AppText style={[styles.rank, index === 0 && { color: colors.primary }]}>{index + 1}</AppText>
                <AlbumArt url={track.albumArtUrl} size={52} />
                <View style={styles.flex}>
                  <AppText variant="bodyStrong" numberOfLines={1}>
                    {track.title}
                  </AppText>
                  <AppText variant="caption" color={colors.textSecondary} numberOfLines={1}>
                    {track.artist}
                  </AppText>
                </View>
                <AppText variant="label" color={colors.textSecondary}>
                  {track.plays === 1 ? '1 vez' : `${track.plays} veces`}
                </AppText>
              </View>
            ))}
          </View>
        </Appear>
      ) : null}

      {/* D · Artista favorito */}
      {wrapped.topArtist ? (
        <Appear delay={360}>
          <View style={styles.artist} accessible accessibilityLabel={`Artista del viaje: ${wrapped.topArtist.name}`}>
            <AlbumArt url={wrapped.topArtist.albumArtUrl} size={96} radius={48} />
            <View style={styles.flex}>
              <AppText variant="label" color={colors.primaryText} style={styles.kicker}>
                ARTISTA DEL VIAJE
              </AppText>
              <AppText variant="title" numberOfLines={2}>
                {wrapped.topArtist.name}
              </AppText>
              <AppText color={colors.textSecondary}>
                {wrapped.topArtist.plays === 1 ? '1 reproducción' : `${wrapped.topArtist.plays} reproducciones`} ·{' '}
                {wrapped.topArtist.tracks === 1 ? '1 canción' : `${wrapped.topArtist.tracks} canciones`}
              </AppText>
            </View>
          </View>
        </Appear>
      ) : null}

      {/* E · DJ del viaje */}
      {wrapped.dj && djs.length > 0 ? (
        <Appear delay={480}>
          <View style={styles.dj} accessible accessibilityLabel={`El DJ del viaje ha sido ${joinNames(djs.map((p) => p.name))}`}>
            <View style={styles.djAvatars}>
              {djs.slice(0, 3).map((person, index) => (
                <View key={person.name} style={index > 0 ? styles.djOverlap : undefined}>
                  <Avatar kind={person.avatarKind} value={person.avatarValue} size={56} label={person.name} />
                </View>
              ))}
            </View>
            <View style={styles.flex}>
              <View style={styles.djTitle}>
                <Ionicons name="headset" size={18} color={colors.primary} />
                <AppText variant="label" color={colors.primaryText} style={styles.kicker}>
                  {djs.length > 1 ? 'DJS DEL VIAJE' : 'DJ DEL VIAJE'}
                </AppText>
              </View>
              <AppText variant="heading">
                {djs.length > 1 ? `Empate: ${joinNames(djs.map((p) => p.name))}` : `El DJ del viaje ha sido ${djs[0]?.name ?? ''}`}
              </AppText>
              <AppText color={colors.textSecondary}>
                {wrapped.dj.songs === 1 ? 'Puso 1 de las canciones que sonaron' : `Puso ${wrapped.dj.songs} de las canciones que sonaron`}
                {djs.length > 1 ? ' cada uno' : ''}.
              </AppText>
            </View>
          </View>
        </Appear>
      ) : null}
    </View>
  );
}
const WrappedCards = memo(WrappedCardsBase);

function BigStat({ value, label }: { value: string; label: string }) {
  const { colors } = useTheme();
  const styles = useStyles(makeStyles);
  return (
    <View style={styles.bigStat} accessible accessibilityLabel={`${value} ${label}`}>
      <AppText style={styles.bigValue} numberOfLines={1} adjustsFontSizeToFit>
        {value}
      </AppText>
      <AppText variant="caption" color={colors.textSecondary} numberOfLines={1}>
        {label}
      </AppText>
    </View>
  );
}

const makeStyles = (c: Palette) =>
  StyleSheet.create({
    stack: { gap: spacing.md },
    kicker: { letterSpacing: 1.6 },
    flex: { flex: 1 },
    center: { textAlign: 'center' },
    cover: {
      gap: spacing.sm,
      padding: spacing.lg,
      borderRadius: radius.lg,
      backgroundColor: c.surfaceRaised,
      borderWidth: 1,
      borderColor: c.primary,
      overflow: 'hidden',
    },
    coverTitle: { fontFamily: fonts.black, fontSize: 36, lineHeight: 40, letterSpacing: -1.4, color: c.text },
    bigStats: { flexDirection: 'row', gap: spacing.sm, marginVertical: spacing.sm },
    bigStat: { flex: 1, paddingVertical: spacing.sm + 4, paddingHorizontal: spacing.sm, borderRadius: radius.md, backgroundColor: c.surface, gap: 2 },
    bigValue: { fontFamily: fonts.black, fontSize: 30, lineHeight: 34, letterSpacing: -1, color: c.primaryText },
    number1: {
      alignItems: 'center',
      gap: spacing.sm,
      padding: spacing.lg,
      borderRadius: radius.lg,
      backgroundColor: c.surfaceRaised,
      borderWidth: 1,
      borderColor: c.border,
      overflow: 'hidden',
    },
    art: { marginVertical: spacing.sm },
    badge1: { position: 'absolute', top: -12, right: -12, width: 56, height: 56, borderRadius: 28, alignItems: 'center', justifyContent: 'center' },
    badge1Text: { fontFamily: fonts.black, fontSize: 22, lineHeight: 26 },
    card: { gap: spacing.sm + 2, padding: spacing.md + 4, borderRadius: radius.lg, backgroundColor: c.surfaceRaised, borderWidth: 1, borderColor: c.border },
    trackRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm + 4 },
    rank: { fontFamily: fonts.black, fontSize: 28, lineHeight: 32, width: 30, textAlign: 'center', color: c.textSecondary },
    artist: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.md,
      padding: spacing.md + 4,
      borderRadius: radius.lg,
      backgroundColor: c.primarySoft,
    },
    dj: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.md,
      padding: spacing.md + 4,
      borderRadius: radius.lg,
      backgroundColor: c.surfaceRaised,
      borderWidth: 1,
      borderColor: c.border,
    },
    djAvatars: { flexDirection: 'row' },
    djOverlap: { marginLeft: -14 },
    djTitle: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  });

