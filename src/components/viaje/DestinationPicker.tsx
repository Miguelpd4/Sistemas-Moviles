import Ionicons from '@expo/vector-icons/Ionicons';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';

import { AppText, Button, Notice, TextField } from '@/components/ui';
import { useDebouncedValue } from '@/hooks/useDebouncedValue';
import { errorMessage } from '@/lib/errors';
import type { Place } from '@/lib/route';
import { searchPlaces } from '@/services/location/maps';
import { setDestination, type Destination } from '@/services/supabase/sessions';
import { radius, spacing, useTheme } from '@/theme';

type Props = { sessionId: string; destination: Destination | null };

/** Poner o cambiar el destino (#29). Lo ven el conductor y el copiloto. */
export function DestinationPicker({ sessionId, destination }: Props) {
  const { colors } = useTheme();
  const [editing, setEditing] = useState(destination === null);
  const [text, setText] = useState('');
  const query = useDebouncedValue(text.trim(), 700);
  const [found, setFound] = useState<{ query: string; places: Place[] } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (query.length < 3) return;
    let active = true;
    searchPlaces(query)
      .then((places) => active && setFound({ query, places }))
      .catch((err: unknown) => active && setError(errorMessage(err)));
    return () => {
      active = false;
    };
  }, [query]);

  const searching = query.length >= 3 && found?.query !== query && error === null;
  const places = query.length >= 3 && found?.query === query ? found.places : [];

  const save = (place: Place | null) => {
    setSaving(true);
    setError(null);
    setDestination(sessionId, place ? { name: place.name, lat: place.lat, lon: place.lon } : null)
      .then(() => {
        setText('');
        setEditing(place === null);
      })
      .catch((err: unknown) => setError(errorMessage(err)))
      .finally(() => setSaving(false));
  };

  if (!editing && destination) {
    return (
      <View style={styles.row}>
        <Ionicons name="flag-outline" size={22} color={colors.primary} />
        <AppText variant="bodyStrong" style={styles.flex} numberOfLines={1}>
          {destination.name}
        </AppText>
        <Button label="Cambiar" variant="secondary" onPress={() => setEditing(true)} />
      </View>
    );
  }

  return (
    <View style={styles.box}>
      <TextField
        label={destination ? `Nuevo destino (ahora: ${destination.name})` : 'Destino del viaje'}
        value={text}
        onChangeText={(value) => {
          setText(value);
          setError(null);
        }}
        placeholder="Ciudad, calle o sitio"
        returnKeyType="search"
      />
      {searching || saving ? <ActivityIndicator color={colors.primary} /> : null}
      {error ? <Notice message={error} /> : null}
      {places.map((place) => (
        <Pressable
          key={`${place.lat},${place.lon}`}
          accessibilityRole="button"
          accessibilityLabel={`Ir a ${place.name}, ${place.detail}`}
          onPress={() => save(place)}
          style={({ pressed }) => [styles.place, { backgroundColor: pressed ? colors.surfaceStrong : colors.surface }]}
        >
          <AppText variant="bodyStrong" numberOfLines={1}>
            {place.name}
          </AppText>
          <AppText variant="caption" color={colors.textSecondary} numberOfLines={1}>
            {place.detail}
          </AppText>
        </Pressable>
      ))}
      {query.length >= 3 && !searching && places.length === 0 && error === null ? (
        <AppText color={colors.textSecondary}>No encontramos «{query}». Prueba con otro nombre.</AppText>
      ) : null}
      {destination ? (
        <View style={styles.row}>
          <Button label="Dejar como estaba" variant="ghost" onPress={() => setEditing(false)} />
          <Button label="Quitar destino" variant="ghost" icon="close" onPress={() => save(null)} />
        </View>
      ) : null}
      <AppText variant="caption" color={colors.textTertiary}>
        Búsqueda de © OpenStreetMap (Nominatim).
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  box: { gap: spacing.sm },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  flex: { flex: 1 },
  place: { padding: spacing.md, borderRadius: radius.md, gap: 2 },
});
