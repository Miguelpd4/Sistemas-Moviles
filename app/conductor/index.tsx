import { useKeepAwake } from 'expo-keep-awake';
import { router, useLocalSearchParams } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { LicensePlate } from '@/components/coche/LicensePlate';
import { DriverEta } from '@/components/conductor/DriverEta';
import { DriverStats } from '@/components/conductor/DriverStats';
import { JoinQr } from '@/components/conductor/JoinQr';
import { MusicPlayer } from '@/components/conductor/MusicPlayer';
import { NowPlayingLine } from '@/components/conductor/NowPlayingLine';
import { StopBanner } from '@/components/conductor/StopBanner';
import { TripButton } from '@/components/conductor/TripButton';
import { PendingList } from '@/components/sala/PendingList';
import { AppText, Button, Notice, Sheet, Switch, TextField } from '@/components/ui';
import { SessionProvider } from '@/context/SessionProvider';
import { useCurrentTrip } from '@/hooks/useCurrentTrip';
import { useHostPlayer } from '@/hooks/useHostPlayer';
import { usePlayerOwnership } from '@/hooks/usePlayerOwnership';
import { useQueue } from '@/hooks/useQueue';
import { useSession } from '@/hooks/useSession';
import { useSongQuizHost } from '@/hooks/useSongQuizHost';
import { useTripControls } from '@/hooks/useTripControls';
import { useTripMetrics } from '@/hooks/useTripMetrics';
import { useYouTubeController } from '@/hooks/useYouTubeController';
import { carModelTitle } from '@/lib/carCatalog';
import { errorMessage } from '@/lib/errors';
import { openLocationSettings } from '@/services/location/tracking';
import { setJoinMode } from '@/services/supabase/sessions';
import { ForceDarkTheme, driverColors, fonts, radius, spacing } from '@/theme';

function useClock(): string {
  const format = () => new Date().toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
  const [time, setTime] = useState(format);
  useEffect(() => {
    const timer = setInterval(() => setTime(format()), 10_000);
    return () => clearInterval(timer);
  }, []);
  return time;
}

/**
 * Modo conductor (S2-10): pantalla única, oscura y con letra enorme. Todo lo que el conductor
 * necesita durante el viaje está aquí; la pantalla no se apaga sola.
 */
export default function ModoConductorScreen() {
  const params = useLocalSearchParams<{ sessionId?: string }>();
  const { trip, loading: tripLoading } = useCurrentTrip();
  const sessionId = params.sessionId ?? (trip?.role === 'conductor' ? trip.sessionId : null);

  // Sin viaje que mostrar: volver a Inicio.
  useEffect(() => {
    if (sessionId === null && !tripLoading && !params.sessionId) {
      const timer = setTimeout(() => router.replace('/'), 600);
      return () => clearTimeout(timer);
    }
    return undefined;
  }, [sessionId, tripLoading, params.sessionId]);

  return (
    <ForceDarkTheme>
      <SafeAreaView style={styles.safe}>
        <StatusBar style="light" />
        {sessionId ? (
          <SessionProvider sessionId={sessionId}>
            <DriverMode />
          </SessionProvider>
        ) : (
          <ActivityIndicator size="large" color={driverColors.accent} style={styles.loader} />
        )}
      </SafeAreaView>
    </ForceDarkTheme>
  );
}

function DriverMode() {
  useKeepAwake();
  const clock = useClock();
  const { sessionId, session, members, pending, online, isHost, error, status } = useSession();
  const queue = useQueue();
  const metrics = useTripMetrics();
  const trip = useTripControls();
  // El reproductor de YouTube de esta pantalla (#57): lo comparten la cola y «Adivina la canción».
  const youtube = useYouTubeController();
  const [showQr, setShowQr] = useState(false);
  const [price, setPrice] = useState('');
  const [modeError, setModeError] = useState<string | null>(null);

  const tripStatus = session?.status ?? 'abierta';
  const running = tripStatus === 'en_curso';
  // Solo el móvil del conductor pone la música (en Android y en la web, sin cuentas), y solo desde
  // un Modo conductor a la vez: si hubiera dos abiertos, sonaría doble.
  const ownsPlayer = usePlayerOwnership();
  const playerEnabled = isHost && ownsPlayer && tripStatus !== 'finalizada';
  const pauseMusic = youtube.pause;
  useEffect(() => {
    if (!ownsPlayer) pauseMusic();
  }, [ownsPlayer, pauseMusic]);
  // «Adivina la canción» (#21): mientras suena el fragmento, la cola espera.
  const quiz = useSongQuizHost(youtube, playerEnabled);
  const player = useHostPlayer(queue, youtube, playerEnabled && !quiz.playing);

  // Al abrir la hoja del precio, se rellena con el propuesto (ajuste durante el render, como
  // recomienda React para el estado que depende de otro valor, en vez de un efecto).
  const priceKey = trip.phase === 'price' ? trip.suggestedPrice : null;
  const [prevPriceKey, setPrevPriceKey] = useState<string | null>(null);
  if (priceKey !== prevPriceKey) {
    setPrevPriceKey(priceKey);
    if (priceKey !== null) setPrice(priceKey);
  }

  const passengers = members.filter((member) => member.role !== 'conductor');
  const connected = passengers.filter((member) => online.has(member.user_id)).length;
  const model = session ? carModelTitle(session.car.make, session.car.model, session.car.version) : null;

  const toggleApproval = async (value: boolean) => {
    setModeError(null);
    try {
      await setJoinMode(sessionId, value ? 'aprobacion' : 'libre');
    } catch (err) {
      setModeError(errorMessage(err));
    }
  };

  if (session === null) {
    return error ? (
      <View style={styles.content}>
        <Notice message={error} />
        <Button label="Volver al inicio" variant="driver" onPress={() => router.replace('/')} />
      </View>
    ) : (
      <ActivityIndicator size="large" color={driverColors.accent} style={styles.loader} />
    );
  }

  return (
    <View style={styles.flex}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.top}>
          <AppText variant="bodyStrong" color={driverColors.accent}>
            {running ? 'Hora actual' : 'Modo conductor'}
          </AppText>
          <AppText style={styles.clock} color={driverColors.text} accessibilityLabel={`Son las ${clock}`}>
            {clock}
          </AppText>
          <View style={styles.carLine}>
            <AppText variant="heading" color={driverColors.textSecondary} numberOfLines={1} style={styles.flex}>
              {session.carName}
              {model && model !== 'Coche' && model !== session.carName ? ` · ${model}` : ''}
            </AppText>
            <LicensePlate code={session.nfcCode} size="sm" />
          </View>
        </View>

        {status === 'sin_conexion' ? <Notice tone="info" message="Reconectando con la sala…" /> : null}

        <DriverEta
          destination={session.destination}
          car={running && metrics?.last_lat != null && metrics.last_lon != null ? { lat: metrics.last_lat, lon: metrics.last_lon } : null}
        />

        <DriverStats distanceM={metrics?.distance_m ?? 0} startedAt={session.startedAt} passengers={passengers.length} connected={connected} />

        <NowPlayingLine item={queue.nowPlaying} upcoming={queue.upcoming.length} />
        {quiz.playing ? <Notice tone="info" message="Adivina la canción: suena un fragmento de 10 s y luego vuelve la cola." /> : null}
        {quiz.error ? <Notice message={quiz.error} /> : null}

        {!running ? (
          <>
            <PendingList sessionId={sessionId} pending={pending} dark />
            <View style={styles.panel}>
              <Switch
                label="Pedir aprobación para entrar"
                description="Aceptas a cada pasajero antes de que entre. Solo con el coche parado."
                value={session.joinMode === 'aprobacion'}
                onChange={(value) => void toggleApproval(value)}
              />
              {modeError ? <Notice message={modeError} /> : null}
            </View>
          </>
        ) : null}

        {!running || showQr ? (
          <View style={styles.qr}>
            <JoinQr nfcCode={session.nfcCode} />
          </View>
        ) : (
          <Button label="Mostrar QR para unirse" variant="driver" icon="qr-code-outline" onPress={() => setShowQr(true)} />
        )}
        {running && showQr ? <Button label="Ocultar QR" variant="driver" onPress={() => setShowQr(false)} /> : null}

        {isHost && tripStatus !== 'finalizada' ? (
          <MusicPlayer
            playerRef={youtube.playerRef}
            onEvent={youtube.onEvent}
            state={youtube.state}
            playerError={youtube.error}
            hasSong={queue.nowPlaying !== null}
            queueError={player.error}
          />
        ) : null}

        {trip.error ? <Notice message={trip.error} /> : null}
        {trip.needsSettings ? <Button label="Abrir ajustes de ubicación" variant="driver" icon="settings-outline" onPress={openLocationSettings} /> : null}

        {isHost ? (
          running ? (
            <TripButton mode="finish" busy={trip.phase === 'finishing'} onPress={() => void trip.requestFinish()} />
          ) : (
            <TripButton mode="start" busy={trip.phase === 'preparing' || trip.phase === 'starting'} onPress={() => void trip.prepareStart()} />
          )
        ) : null}

        <View style={styles.links}>
          <Button
            label="Ver sala"
            variant="driver"
            icon="people-outline"
            onPress={() => router.push({ pathname: '/sala/[sessionId]', params: { sessionId } })}
          />
          {!running ? <Button label="Volver al inicio" variant="driver" icon="home-outline" onPress={() => router.replace('/')} /> : null}
          {!running && isHost ? (
            <Button label="Cerrar el viaje sin salir" variant="ghost" onPress={() => void trip.requestFinish()} />
          ) : null}
        </View>
      </ScrollView>

      <StopBanner />

      <Sheet
        visible={trip.phase === 'price' || trip.phase === 'starting'}
        title="Precio del combustible"
        description={
          trip.suggestedPrice
            ? 'Es la media de las gasolineras más cercanas. Cámbialo si has repostado a otro precio.'
            : 'No hemos podido consultarlo. Escribe lo que pagaste por litro.'
        }
        onClose={trip.cancel}
        dark
      >
        <TextField
          label="Euros por litro"
          value={price}
          onChangeText={setPrice}
          keyboardType="decimal-pad"
          placeholder="1,559"
          autoFocus={!trip.suggestedPrice}
        />
        {trip.error ? <Notice message={trip.error} /> : null}
        <TripButton mode="start" busy={trip.phase === 'starting'} onPress={() => void trip.confirmStart(price)} />
        <Button label="Cancelar" variant="ghost" onPress={trip.cancel} />
      </Sheet>

      <Sheet
        visible={trip.phase === 'confirm_finish' || trip.phase === 'finishing'}
        title={running ? '¿Finalizar el viaje?' : '¿Cerrar el viaje?'}
        description={
          running
            ? 'Se para el GPS, se guarda la distancia y todos verán el resumen.'
            : 'Nadie podrá entrar ya con la pegatina. Podrás crear otro viaje cuando quieras.'
        }
        onClose={trip.cancel}
        dark
      >
        <TripButton mode={running ? 'finish' : 'cancel'} busy={trip.phase === 'finishing'} onPress={() => void trip.confirmFinish()} />
        <Button label="Seguir" variant="ghost" onPress={trip.cancel} />
      </Sheet>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: driverColors.background },
  flex: { flex: 1 },
  loader: { marginTop: spacing.xxl },
  content: { padding: spacing.lg - 4, gap: spacing.md, paddingBottom: spacing.xxl },
  top: { alignItems: 'stretch', gap: 2 },
  clock: { fontFamily: fonts.black, fontSize: 104, lineHeight: 110, letterSpacing: -4, textAlign: 'center' },
  carLine: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, marginTop: spacing.xs },
  panel: { backgroundColor: driverColors.surface, borderRadius: radius.md, paddingHorizontal: spacing.md, paddingVertical: spacing.xs },
  qr: { backgroundColor: driverColors.surface, borderRadius: radius.lg, paddingVertical: spacing.lg },
  links: { gap: spacing.sm },
});
