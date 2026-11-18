import Ionicons from '@expo/vector-icons/Ionicons';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, TextInput, View } from 'react-native';

import { AppText, Button, Notice } from '@/components/ui';
import { useDebouncedValue } from '@/hooks/useDebouncedValue';
import { errorMessage } from '@/lib/errors';
import { searchTracks } from '@/services/spotify/search';
import { radius, spacing, typography, useTheme } from '@/theme';
import type { SpotifyTrack } from '@/types/spotify';

import { TrackRow } from './TrackRow';

type Props = {
  /** Si el usuario ya tiene 3 canciones esperando. */
  full: boolean;
  onAdd: (track: SpotifyTrack) => Promise<void>;
};

/** Buscador de canciones (Spotify, a través de la Edge Function) con resultados para añadir. */
export function SearchBox({ full, onAdd }: Props) {
  const { colors, scheme } = useTheme();
  const [text, setText] = useState('');
  const query = useDebouncedValue(text.trim(), 400);
  const [results, setResults] = useState<SpotifyTrack[]>([]);
  const [searching, setSearching] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);
  const [adding, setAdding] = useState<string | null>(null);
  const [added, setAdded] = useState<ReadonlySet<string>>(new Set());

  useEffect(() => {
    if (query.length < 2) {
      setResults([]);
      setError(null);
      return;
    }
    let active = true;
    setSearching(true);
    searchTracks(query)
      .then((tracks) => {
        if (!active) return;
        setResults(tracks);
        setError(null);
      })
      .catch((err: unknown) => active && setError(errorMessage(err, 'No se ha podido buscar.')))
      .finally(() => active && setSearching(false));
    return () => {
      active = false;
    };
  }, [query, attempt]);

  const add = async (track: SpotifyTrack) => {
    setAdding(track.id);
    setError(null);
    try {
      await onAdd(track);
      setAdded((current) => new Set([...current, track.id]));
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setAdding(null);
    }
  };

  return (
    <View style={styles.wrapper}>
      <View style={[styles.field, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <Ionicons name="search" size={20} color={colors.textTertiary} />
        <TextInput
          value={text}
          onChangeText={setText}
          placeholder="Busca una canción o artista"
          placeholderTextColor={colors.textTertiary}
          selectionColor={colors.primary}
          keyboardAppearance={scheme}
          returnKeyType="search"
          autoCorrect={false}
          accessibilityLabel="Buscar canciones"
          maxFontSizeMultiplier={1.6}
          style={[styles.input, { color: colors.text }]}
        />
        {searching ? <ActivityIndicator color={colors.primary} /> : null}
        {text.length > 0 && !searching ? (
          <Pressable accessibilityRole="button" accessibilityLabel="Borrar búsqueda" onPress={() => setText('')} hitSlop={8}>
            <Ionicons name="close-circle" size={20} color={colors.textTertiary} />
          </Pressable>
        ) : null}
      </View>

      {full ? <Notice tone="info" message="Ya tienes 3 canciones esperando. Podrás añadir otra cuando suene alguna." /> : null}
      {error ? (
        <View style={styles.error}>
          <Notice message={error} />
          <Button label="Reintentar" variant="secondary" icon="refresh" onPress={() => setAttempt((n) => n + 1)} />
        </View>
      ) : null}

      {results.length > 0 ? (
        <View>
          {results.map((track) => (
            <TrackRow
              key={track.id}
              track={track}
              disabled={full}
              adding={adding === track.id}
              added={added.has(track.id)}
              onAdd={(item) => void add(item)}
            />
          ))}
        </View>
      ) : query.length >= 2 && !searching && !error ? (
        <AppText color={colors.textSecondary}>No hay resultados para «{query}».</AppText>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { gap: spacing.sm + 4 },
  field: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    borderWidth: 1.5,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.md,
    minHeight: 54,
  },
  input: { ...typography.bodyStrong, flex: 1, paddingVertical: spacing.sm },
  error: { gap: spacing.sm },
});
