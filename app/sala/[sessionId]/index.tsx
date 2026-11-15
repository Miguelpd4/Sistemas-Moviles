import { useLocalSearchParams } from 'expo-router';
import { useMemo } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { CarHero } from '@/components/coche/CarHero';
import { PassengerList } from '@/components/conductor/PassengerList';
import { SeatMap, type SeatOccupant } from '@/components/sala/SeatMap';
import { AppText, Badge, Notice, Screen } from '@/components/ui';
import { useSessionInfo } from '@/hooks/useSessionInfo';
import { useSessionMembers } from '@/hooks/useSessionMembers';
import { spacing, useTheme } from '@/theme';

/**
 * Pestaña Sala, versión del Sprint 1: el coche, quién va en él y dónde, en vivo.
 * Aprobación, copiloto y «Pedir parada» llegan en el Sprint 2.
 */
export default function SalaScreen() {
  const { colors } = useTheme();
  const { sessionId } = useLocalSearchParams<{ sessionId: string }>();
  const { session, error: sessionError } = useSessionInfo(sessionId ?? null);
  const { inside, loading, error } = useSessionMembers(sessionId ?? null);

  const occupants = useMemo(() => {
    const bySeat: Record<number, SeatOccupant> = {};
    for (const member of inside) {
      if (member.seat !== null) {
        bySeat[member.seat] = { name: member.display_name, avatarKind: member.avatar_kind, avatarValue: member.avatar_value };
      }
    }
    return bySeat;
  }, [inside]);

  const seats = session?.seats ?? Math.max(5, ...inside.map((member) => member.seat ?? 0));
  const driver = inside.find((member) => member.role === 'conductor');
  const live = session?.status === 'en_curso';

  return (
    <Screen>
      {session ? (
        <CarHero
          car={session.car}
          code={session.nfcCode}
          overline={driver ? `Coche de ${driver.display_name}` : 'En el coche'}
          extra={`${session.seats} plazas`}
        >
          <View style={styles.badges}>
            <Badge label={live ? 'En marcha' : 'Esperando para salir'} tone={live ? 'live' : 'primary'} />
            <Badge label={`${inside.length} ${inside.length === 1 ? 'persona' : 'personas'}`} />
          </View>
        </CarHero>
      ) : sessionError === null ? (
        <ActivityIndicator color={colors.primary} />
      ) : null}

      {sessionError !== null ? <Notice message={sessionError} /> : null}
      {error !== null ? <Notice message={error} /> : null}

      <View style={styles.section}>
        <AppText variant="title" accessibilityRole="header">
          Quién va dónde
        </AppText>
        {loading && inside.length === 0 ? <ActivityIndicator color={colors.primary} /> : null}
        <SeatMap seats={seats} taken={Object.keys(occupants).map(Number)} occupants={occupants} paint={session?.car.color ?? null} />
      </View>

      <View style={styles.section}>
        <AppText variant="title" accessibilityRole="header">
          En el coche
        </AppText>
        <PassengerList members={inside} />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  badges: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs },
  section: { gap: spacing.md, marginTop: spacing.sm },
});
