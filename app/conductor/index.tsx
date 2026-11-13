import { router, useLocalSearchParams } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { JoinQr } from '@/components/conductor/JoinQr';
import { PassengerList } from '@/components/conductor/PassengerList';
import { AppText, Button, Notice } from '@/components/ui';
import { useCurrentTrip } from '@/hooks/useCurrentTrip';
import { useSessionInfo } from '@/hooks/useSessionInfo';
import { useSessionMembers } from '@/hooks/useSessionMembers';
import { driverColors, spacing } from '@/theme';

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

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar style="light" />
      <ScrollView contentContainerStyle={styles.content}>
        <AppText style={styles.clock} color={driverColors.text} accessibilityLabel={`Son las ${clock}`}>
          {clock}
        </AppText>

        {error !== null ? <Notice message={error} /> : null}
        {membersError !== null ? <Notice message={membersError} /> : null}

        {session === null && error === null ? (
          <ActivityIndicator size="large" color={driverColors.accent} />
        ) : null}

        {session !== null ? (
          <>
            <AppText variant="heading" color={driverColors.textSecondary}>
              {session.carName}
            </AppText>
            <View style={styles.count} accessible accessibilityLabel={`${passengers.length} pasajeros`}>
              <AppText style={styles.countNumber} color={driverColors.accent}>
                {passengers.length}
              </AppText>
              <AppText variant="heading" color={driverColors.text}>
                {passengers.length === 1 ? 'pasajero' : 'pasajeros'}
              </AppText>
            </View>
            <JoinQr nfcCode={session.nfcCode} />
            <PassengerList members={inside} dark />
            <Button
              label="Ver sala"
              variant="secondary"
              onPress={() => router.push({ pathname: '/sala/[sessionId]', params: { sessionId: session.id } })}
            />
          </>
        ) : null}

        <Button label="Volver al inicio" variant="inverse" onPress={() => router.replace('/')} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: driverColors.background },
  content: { padding: spacing.lg, gap: spacing.lg, alignItems: 'stretch' },
  clock: { fontSize: 96, lineHeight: 104, fontWeight: '800', textAlign: 'center' },
  count: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'center', gap: spacing.sm },
  countNumber: { fontSize: 64, lineHeight: 72, fontWeight: '800' },
});
