import { useLocalSearchParams } from 'expo-router';
import { Tabs } from 'expo-router/js-tabs';
import { useCallback, useState } from 'react';
import { View, StyleSheet } from 'react-native';

import { GameInviteBanner } from '@/components/sala/GameInviteBanner';
import { StopButton } from '@/components/sala/StopButton';
import { TabIcon, Toast, useTabBarOptions } from '@/components/ui';
import { useTheme } from '@/theme';
import { SessionProvider } from '@/context/SessionProvider';
import { useBroadcast } from '@/hooks/useBroadcast';
import { useGameInvites } from '@/hooks/useGameInvites';
import { useSession } from '@/hooks/useSession';

/**
 * Pestañas de la sala dentro del proveedor de tiempo real, con «Pedir parada» encima y el aviso
 * de partida nueva, que se ve en cualquier pestaña y marca la de Juegos (o Música, para el DJ).
 */
export default function SalaLayout() {
  const { sessionId } = useLocalSearchParams<{ sessionId: string }>();
  if (!sessionId) return null;
  return (
    <SessionProvider sessionId={sessionId}>
      <SalaTabs />
    </SessionProvider>
  );
}

function SalaTabs() {
  const options = useTabBarOptions();
  const { colors } = useTheme();
  const { isHost, session, myId } = useSession();
  const invites = useGameInvites();
  const { viewed } = invites;
  const badgeStyle = { backgroundColor: colors.primary, color: colors.textOnPrimary };
  const [toast, setToast] = useState<string | null>(null);
  const hide = useCallback(() => setToast(null), []);

  // Avisos para todos: alguien pide parada o se salta una canción.
  useBroadcast('pedir_parada', (event) => {
    if (event.userId !== myId) setToast(`${event.name} ha pedido parar`);
  });
  useBroadcast('queue', (change) => {
    if (change.eventType === 'UPDATE' && change.new.status === 'saltada') setToast('Canción saltada por votación');
  });

  const showStop = !isHost && session !== null && session.status !== 'finalizada';

  return (
    <View style={styles.flex}>
      <Tabs screenOptions={options} screenListeners={({ route }) => ({ focus: () => viewed(route.name) })}>
        <Tabs.Screen
          name="index"
          options={{ title: 'Sala', tabBarIcon: (p) => <TabIcon name="people" outline="people-outline" {...p} /> }}
        />
        <Tabs.Screen
          name="musica"
          options={{
            title: 'Música',
            tabBarIcon: (p) => <TabIcon name="musical-notes" outline="musical-notes-outline" {...p} />,
            tabBarBadge: invites.pending.musica ? '¡!' : undefined,
            tabBarBadgeStyle: badgeStyle,
          }}
        />
        <Tabs.Screen
          name="juegos"
          options={{
            title: 'Juegos',
            tabBarIcon: (p) => <TabIcon name="game-controller" outline="game-controller-outline" {...p} />,
            tabBarBadge: invites.pending.juegos ? '¡!' : undefined,
            tabBarBadgeStyle: badgeStyle,
            tabBarAccessibilityLabel: invites.pending.juegos ? 'Juegos, hay una partida nueva' : undefined,
          }}
        />
        <Tabs.Screen
          name="viaje"
          options={{ title: 'Viaje', tabBarIcon: (p) => <TabIcon name="map" outline="map-outline" {...p} /> }}
        />
        <Tabs.Screen
          name="pagos"
          options={{ title: 'Pagos', tabBarIcon: (p) => <TabIcon name="card" outline="card-outline" {...p} /> }}
        />
      </Tabs>
      {showStop ? <StopButton onSent={() => setToast('Parada pedida. El conductor ya lo sabe.')} /> : null}
      <Toast message={toast} onHide={hide} />
      {invites.invite ? (
        <GameInviteBanner
          gameName={invites.invite.gameName}
          creatorName={invites.invite.creatorName}
          tab={invites.invite.tab}
          onEnter={invites.enter}
          onDismiss={invites.dismiss}
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({ flex: { flex: 1 } });
