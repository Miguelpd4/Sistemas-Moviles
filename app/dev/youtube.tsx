import { useEffect, useRef, useState } from 'react';
import { FlatList, Platform, StyleSheet, View } from 'react-native';

import { AlbumArt } from '@/components/musica/AlbumArt';
import { YouTubePlayer, type YouTubePlayerHandle } from '@/components/musica/YouTubePlayer';
import { AppText, Badge, Button, Card, Notice, Screen, TextField } from '@/components/ui';
import { errorMessage } from '@/lib/errors';
import { formatClock } from '@/lib/format';
import { playerErrorMessage } from '@/lib/youtube';
import { useYouTubeLogin } from '@/services/youtube/auth';
import { youtubeRedirectUri } from '@/services/youtube/config';
import { searchYouTube } from '@/services/youtube/search';
import { spacing, useTheme } from '@/theme';
import type { YouTubePlayerEvent, YouTubeTrack } from '@/types/youtube';

/** Duración del fragmento de «Adivina la canción». */
const CLIP_MS = 10_000;

/**
 * Prueba técnica de YouTube (#54): conectar la cuenta de Google del conductor, buscar y que suene
 * dentro de COPI. Se ve también en la versión release y en la web para poder probarla en el móvil.
 */
export default function DevYouTubeScreen() {
  const { colors } = useTheme();
  const login = useYouTubeLogin();
  const playerRef = useRef<YouTubePlayerHandle>(null);
  const clipTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [query, setQuery] = useState('Columbia Quevedo');
  const [tracks, setTracks] = useState<YouTubeTrack[]>([]);
  const [current, setCurrent] = useState<YouTubeTrack | null>(null);
  const [state, setState] = useState('sin cargar');
  const [progress, setProgress] = useState({ currentMs: 0, durationMs: 0 });
  const [playerError, setPlayerError] = useState<string | null>(null);
  const [log, setLog] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);

  useEffect(
    () => () => {
      if (clipTimer.current) clearTimeout(clipTimer.current);
    },
    [],
  );

  const note = (line: string) => setLog((lines) => [`${new Date().toLocaleTimeString('es-ES')} · ${line}`, ...lines].slice(0, 15));

  const search = () => {
    setBusy(true);
    const started = Date.now();
    searchYouTube(query)
      .then((found) => {
        setTracks(found);
        note(`Buscar «${query}»: ${found.length} canciones (${Date.now() - started} ms)`);
      })
      .catch((err: unknown) => note(`Buscar: ${errorMessage(err)}`))
      .finally(() => setBusy(false));
  };

  const play = (track: YouTubeTrack, startSeconds = 0) => {
    setCurrent(track);
    setPlayerError(null);
    playerRef.current?.send({ type: 'load', videoId: track.videoId, startSeconds });
    note(`Poner «${track.title}» desde ${formatClock(startSeconds * 1000)}`);
  };

  /** Como «Adivina la canción»: 10 s desde un punto al azar y pausa. */
  const playClip = () => {
    if (!current) return;
    const durationMs = progress.durationMs || current.durationMs;
    const from = Math.floor((durationMs * (0.2 + Math.random() * 0.5)) / 1000);
    play(current, from);
    if (clipTimer.current) clearTimeout(clipTimer.current);
    clipTimer.current = setTimeout(() => {
      playerRef.current?.send({ type: 'pause' });
      note('Fragmento de 10 s terminado: pausa');
    }, CLIP_MS);
  };

  const onPlayerEvent = (event: YouTubePlayerEvent) => {
    if (event.type === 'progress') setProgress({ currentMs: event.currentMs, durationMs: event.durationMs });
    else if (event.type === 'state') setState(event.state);
    else if (event.type === 'ready') note('Reproductor listo');
    else {
      const message = event.code === -1 ? 'No se ha podido cargar el reproductor de YouTube.' : playerErrorMessage(event.code);
      setPlayerError(message);
      note(`Error del reproductor (${event.code}): ${message}`);
    }
  };

  return (
    <Screen>
      <AppText variant="title" accessibilityRole="header">
        Prueba de YouTube
      </AppText>
      <AppText color={colors.textSecondary}>
        Cuenta de Google del conductor, búsqueda y reproducción dentro de COPI (#54).
      </AppText>

      <Card>
        <AppText variant="heading">1. Cuenta de Google</AppText>
        {Platform.OS === 'web' ? (
          <AppText variant="caption" color={colors.textSecondary}>
            Redirect URI (web): {youtubeRedirectUri()}
          </AppText>
        ) : null}
        {login.error !== null ? <Notice message={login.error} /> : null}
        <AppText>{login.connected ? `Conectado${login.account ? ` como ${login.account}` : ''}` : 'Sin conectar'}</AppText>
        {login.connected ? (
          <Button label="Desconectar" variant="secondary" onPress={() => void login.logout()} />
        ) : (
          <Button label="Conectar YouTube" icon="logo-youtube" onPress={login.login} disabled={!login.ready} loading={login.busy} />
        )}
      </Card>

      <Card>
        <AppText variant="heading">2. Buscar canciones</AppText>
        <TextField label="Canción o artista" value={query} onChangeText={setQuery} returnKeyType="search" onSubmitEditing={search} />
        <Button label="Buscar" icon="search" onPress={search} loading={busy} disabled={!login.connected || query.trim().length < 2} />
        <FlatList
          data={tracks}
          scrollEnabled={false}
          keyExtractor={(track) => track.videoId}
          renderItem={({ item }) => (
            <View style={styles.track}>
              <AlbumArt url={item.thumbnailUrl} size={48} />
              <View style={styles.trackText}>
                <AppText variant="bodyStrong" numberOfLines={1}>
                  {item.title}
                </AppText>
                <AppText variant="caption" color={colors.textSecondary} numberOfLines={1}>
                  {item.artist} · {formatClock(item.durationMs)}
                </AppText>
                {item.official ? <Badge label="Audio oficial" tone="primary" /> : null}
              </View>
              <Button label="Poner" variant="secondary" onPress={() => play(item)} />
            </View>
          )}
        />
      </Card>

      <Card>
        <AppText variant="heading">3. Reproductor dentro de COPI</AppText>
        <YouTubePlayer ref={playerRef} onEvent={onPlayerEvent} />
        {playerError ? <Notice message={playerError} /> : null}
        <AppText>
          {current ? `${current.title} · ` : ''}
          {state} · {formatClock(progress.currentMs)} / {formatClock(progress.durationMs)}
        </AppText>
        <View style={styles.row}>
          <Button label="Pausa" variant="secondary" disabled={!current} onPress={() => playerRef.current?.send({ type: 'pause' })} />
          <Button label="Seguir" variant="secondary" disabled={!current} onPress={() => playerRef.current?.send({ type: 'play' })} />
        </View>
        <Button label="Ir a 1:00" variant="secondary" disabled={!current} onPress={() => playerRef.current?.send({ type: 'seek', seconds: 60 })} />
        <Button label="Fragmento de 10 s al azar" variant="secondary" icon="shuffle" disabled={!current} onPress={playClip} />
      </Card>

      <Card>
        <AppText variant="heading">Registro</AppText>
        {log.length === 0 ? <AppText color={colors.textSecondary}>Aquí aparecen los resultados y los tiempos.</AppText> : null}
        {log.map((line) => (
          <AppText key={line} variant="caption">
            {line}
          </AppText>
        ))}
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  track: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingVertical: spacing.xs },
  trackText: { flex: 1, gap: 2, alignItems: 'flex-start' },
  row: { flexDirection: 'row', gap: spacing.sm },
});
