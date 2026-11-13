import { Redirect } from 'expo-router';
import { useState } from 'react';
import { FlatList, Platform, StyleSheet, View } from 'react-native';

import { AppText, Button, Card, Notice, Screen, TextField } from '@/components/ui';
import { errorMessage } from '@/lib/errors';
import { formatDuration } from '@/lib/format';
import { useSpotifyLogin } from '@/services/spotify/auth';
import { getCurrentlyPlaying, pause, playTrack } from '@/services/spotify/player';
import { searchTracks } from '@/services/spotify/search';
import { expireTokensForTesting, getValidAccessToken } from '@/services/spotify/tokens';
import { colors, spacing } from '@/theme';
import type { SpotifyTrack } from '@/types/spotify';

/** Prueba técnica de Spotify (S1-09). Solo existe en desarrollo. */
export default function DevSpotifyScreen() {
  if (!__DEV__) return <Redirect href="/" />;
  return <DevSpotify />;
}

function DevSpotify() {
  const login = useSpotifyLogin();
  const [query, setQuery] = useState('');
  const [tracks, setTracks] = useState<SpotifyTrack[]>([]);
  const [lastTrack, setLastTrack] = useState<string | null>(null);
  const [log, setLog] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);

  const note = (line: string) => setLog((lines) => [`${new Date().toLocaleTimeString('es-ES')} · ${line}`, ...lines].slice(0, 12));

  const run = async (label: string, action: () => Promise<string | void>) => {
    setBusy(true);
    const started = Date.now();
    try {
      const result = await action();
      note(`${label}: OK (${Date.now() - started} ms)${result ? ` · ${result}` : ''}`);
    } catch (error) {
      note(`${label}: ${errorMessage(error)}`);
    } finally {
      setBusy(false);
    }
  };

  const search = () =>
    run('Buscar', async () => {
      const found = await searchTracks(query);
      setTracks(found);
      return `${found.length} resultados`;
    });

  return (
    <Screen>
      <AppText variant="title" accessibilityRole="header">
        Prueba de Spotify
      </AppText>
      {Platform.OS === 'web' ? <Notice tone="info" message="En la web solo funciona la búsqueda (como los pasajeros con iPhone)." /> : null}

      <Card>
        <AppText variant="heading">1. Cuenta del conductor</AppText>
        <AppText color={colors.textSecondary}>Redirect URI: {login.redirectUri}</AppText>
        {login.error !== null ? <Notice message={login.error} /> : null}
        <AppText>{login.connected ? 'Conectado a Spotify' : 'Sin conectar'}</AppText>
        {login.connected ? (
          <>
            <Button label="Forzar caducidad y renovar token" variant="secondary" onPress={() => run('Renovar token', async () => {
              await expireTokensForTesting();
              await getValidAccessToken();
              return 'token renovado';
            })} />
            <Button label="Desconectar" variant="secondary" onPress={() => void login.logout()} />
          </>
        ) : (
          <Button label="Conectar Spotify" onPress={login.login} disabled={!login.ready} loading={login.busy} />
        )}
      </Card>

      <Card>
        <AppText variant="heading">2. Búsqueda (Edge Function)</AppText>
        <TextField label="Canción o artista" value={query} onChangeText={setQuery} returnKeyType="search" onSubmitEditing={search} />
        <Button label="Buscar" onPress={search} loading={busy} disabled={query.trim().length < 2} />
        <FlatList
          data={tracks}
          scrollEnabled={false}
          keyExtractor={(track) => track.id}
          renderItem={({ item }) => (
            <View style={styles.track}>
              <View style={styles.trackText}>
                <AppText variant="bodyStrong" numberOfLines={1}>{item.title}</AppText>
                <AppText variant="caption" color={colors.textSecondary}>
                  {item.artist} · {formatDuration(Math.round(item.durationMs / 1000))}
                </AppText>
              </View>
              {login.connected ? (
                <Button label="Poner" variant="secondary" onPress={() => run(`Reproducir ${item.title}`, async () => {
                  await playTrack(item.id);
                  setLastTrack(item.id);
                })} />
              ) : null}
            </View>
          )}
        />
      </Card>

      {login.connected ? (
        <Card>
          <AppText variant="heading">3. Reproducción en este móvil</AppText>
          <Button label="Saltar a 1:00" variant="secondary" disabled={lastTrack === null} onPress={() => run('Saltar a 1:00', async () => {
            if (lastTrack) await playTrack(lastTrack, 60_000);
          })} />
          <Button label="¿Qué suena?" variant="secondary" onPress={() => run('Qué suena', async () => {
            const state = await getCurrentlyPlaying();
            return state ? `${state.title ?? '?'} · ${Math.round(state.progressMs / 1000)} s · ${state.isPlaying ? 'sonando' : 'en pausa'}` : 'nada';
          })} />
          <Button label="Pausa" variant="secondary" onPress={() => run('Pausa', pause)} />
        </Card>
      ) : null}

      <Card>
        <AppText variant="heading">Registro</AppText>
        {log.length === 0 ? <AppText color={colors.textSecondary}>Aquí aparecen los resultados y tiempos.</AppText> : null}
        {log.map((line) => (
          <AppText key={line} variant="caption">{line}</AppText>
        ))}
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  track: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingVertical: spacing.xs },
  trackText: { flex: 1 },
});
