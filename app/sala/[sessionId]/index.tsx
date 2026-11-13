import { useLocalSearchParams } from 'expo-router';
import { useMemo } from 'react';
import { ActivityIndicator } from 'react-native';

import { PassengerList } from '@/components/conductor/PassengerList';
import { SeatMap, type SeatOccupant } from '@/components/sala/SeatMap';
import { AppText, Notice, Screen } from '@/components/ui';
import { useSessionInfo } from '@/hooks/useSessionInfo';
import { useSessionMembers } from '@/hooks/useSessionMembers';
import { colors } from '@/theme';

/**
 * Pestaña Sala, versión del Sprint 1: quién está en el coche y dónde, en vivo.
 * Aprobación, copiloto y «Pedir parada» llegan en el Sprint 2.
 */
export default function SalaScreen() {
  const { sessionId } = useLocalSearchParams<{ sessionId: string }>();
  const { session } = useSessionInfo(sessionId ?? null);
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

  return (
    <Screen>
      <AppText variant="title" accessibilityRole="header">
        {driver ? `Coche de ${driver.display_name}` : 'Sala'}
      </AppText>
      <AppText color={colors.textSecondary}>
        {inside.length} {inside.length === 1 ? 'persona' : 'personas'} en el coche
      </AppText>
      {error !== null ? <Notice message={error} /> : null}
      {loading && inside.length === 0 ? <ActivityIndicator color={colors.primary} /> : null}
      <SeatMap seats={seats} taken={Object.keys(occupants).map(Number)} occupants={occupants} />
      <PassengerList members={inside} />
    </Screen>
  );
}
