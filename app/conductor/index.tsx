import { router, useLocalSearchParams } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { LicensePlate } from '@/components/coche/LicensePlate';
import { JoinQr } from '@/components/conductor/JoinQr';
import { PassengerList } from '@/components/conductor/PassengerList';
import { AppText, Button, Notice } from '@/components/ui';
import { useCurrentTrip } from '@/hooks/useCurrentTrip';
import { useSessionInfo } from '@/hooks/useSessionInfo';
import { useSessionMembers } from '@/hooks/useSessionMembers';
import { carModelTitle } from '@/lib/carCatalog';
import { driverColors, fonts, radius, spacing } from '@/theme';

function useClock(): string {
  const format = () => new Date().toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
  const [time, setTime] = useState(format);
  useEffect(() => {
    const timer = setInterval(() => setTime(format()), 15_000);
    return () => clearInterval(timer);
  }, []);
  return time;
}

/**
 * Modo conductor, primera versión (S1-08): QR para unirse y pasajeros en vivo.
 * Pantalla única y oscura, con tipografía muy grande para leerla de un vistazo.
 * Hora de llegada, km, música y finalizar viaje llegan en el Sprint 2.
 */
export default function ModoConductorScreen() {
  const params = useLocalSearchParams<{ sessionId?: string }>();
  const { trip, loading: tripLoading } = useCurrentTrip();
  const sessionId = params.sessionId ?? (trip?.role === 'conductor' ? trip.sessionId : null);

  const { session, error } = useSessionInfo(sessionId);
  const { inside, error: membersError } = useSessionMembers(sessionId);
  const clock = useClock();

  // Sin viaje que mostrar: volver a Inicio.
  useEffect(() => {
    if (sessionId === null && !tripLoading && !params.sessionId) {
      const timer = setTimeout(() => router.replace('/'), 600);
      return () => clearTimeout(timer);
    }
    return undefined;
  }, [sessionId, tripLoading, params.sessionId]);

  const passengers = inside.filter((member) => member.role !== 'conductor');
  const model = session ? carModelTitle(session.car.make, session.car.model, session.car.version) : null;

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar style="light" />
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.top}>
          <AppText variant="bodyStrong" color={driverColors.accent}>
            Modo conductor
          </AppText>
          <AppText style={styles.clock} color={driverColors.text} accessibilityLabel={`Son las ${clock}`}>
            {clock}
          </AppText>
        </View>

        {error !== null ? <Notice message={error} /> : null}
        {membersError !== null ? <Notice message={membersError} /> : null}

        {session === null && error === null ? <ActivityIndicator size="large" color={driverColors.accent} /> : null}

        {session !== null ? (
          <>
            <View style={styles.car}>
              <View style={styles.carText}>
                <AppText variant="title" color={driverColors.text} numberOfLines={1}>
                  {session.carName}
                </AppText>
                {model && model !== 'Coche' && model !== session.carName ? (
                  <AppText color={driverColors.textSecondary}>{model}</AppText>
                ) : null}
              </View>
              <LicensePlate code={session.nfcCode} size="sm" />
            </View>

            <View style={styles.count} accessible accessibilityLabel={`${passengers.length} pasajeros`}>
              <AppText style={styles.countNumber} color={driverColors.accent}>
                {passengers.length}
              </AppText>
              <AppText variant="title" color={driverColors.text}>
                {passengers.length === 1 ? 'pasajero' : 'pasajeros'}
              </AppText>
            </View>

            <View style={styles.qrBlock}>
              <JoinQr nfcCode={session.nfcCode} />
            </View>

            <PassengerList members={passengers} dark />

            <Button
              label="Ver sala"
              variant="driver"
              icon="people-outline"
              size="lg"
              onPress={() => router.push({ pathname: '/sala/[sessionId]', params: { sessionId: session.id } })}
            />
          </>
        ) : null}

        <Button label="Volver al inicio" variant="driver" icon="home-outline" onPress={() => router.replace('/')} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: driverColors.background },
  content: { padding: spacing.lg, gap: spacing.lg, alignItems: 'stretch' },
  top: { alignItems: 'center' },
  clock: { fontFamily: fonts.black, fontSize: 104, lineHeight: 110, letterSpacing: -4, textAlign: 'center' },
  car: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: driverColors.surface,
    borderRadius: radius.lg,
    padding: spacing.md,
  },
  carText: { flex: 1 },
  count: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'center', gap: spacing.sm },
  countNumber: { fontFamily: fonts.black, fontSize: 80, lineHeight: 86, letterSpacing: -2 },
  qrBlock: { backgroundColor: driverColors.surface, borderRadius: radius.lg, paddingVertical: spacing.lg },
});
