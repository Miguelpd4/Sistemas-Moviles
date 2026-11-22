import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState, type ComponentProps } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { CarHero } from '@/components/coche/CarHero';
import { SettlementCard } from '@/components/pagos/SettlementCard';
import { AppText, Avatar, Badge, Button, Notice, Screen, ScreenHeader } from '@/components/ui';
import { useAuth } from '@/hooks/useAuth';
import { useTripMoney } from '@/hooks/useTripMoney';
import { errorMessage } from '@/lib/errors';
import { formatDuration, formatEuros, formatKm } from '@/lib/format';
import { tripMoney } from '@/lib/tripMoney';
import { getSessionMembers, getSessionWithCar, type SessionWithCar } from '@/services/supabase/sessions';
import { getTripMetrics, type TripMetrics } from '@/services/supabase/trip';
import { radius, spacing, useStyles, useTheme, type Palette } from '@/theme';
import type { SessionMember } from '@/types/session';

type MciName = ComponentProps<typeof MaterialCommunityIcons>['name'];

/**
 * Resumen del viaje: distancia, tiempo, quién iba y el reparto de los gastos con quién paga a quién
 * (#25). La canción del viaje y el ganador de los juegos llegan más adelante.
 */
export default function ResumenScreen() {
  const { colors } = useTheme();
  const styles = useStyles(makeStyles);
  const { sessionId } = useLocalSearchParams<{ sessionId: string }>();
  const [session, setSession] = useState<SessionWithCar | null>(null);
  const [members, setMembers] = useState<SessionMember[]>([]);
  const [metrics, setMetrics] = useState<TripMetrics | null>(null);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuth();
  const myId = user?.id ?? null;
  const money = useTripMoney(sessionId ?? null, session?.status === 'finalizada');

  useEffect(() => {
    if (!sessionId) return;
    let active = true;
    Promise.all([getSessionWithCar(sessionId), getSessionMembers(sessionId), getTripMetrics(sessionId)])
      .then(([nextSession, nextMembers, nextMetrics]) => {
        if (!active) return;
        setSession(nextSession);
        setMembers(nextMembers.filter((member) => member.status === 'dentro'));
        setMetrics(nextMetrics);
      })
      .catch((err: unknown) => active && setError(errorMessage(err, 'No se ha podido cargar el resumen.')));
    return () => {
      active = false;
    };
  }, [sessionId]);

  const distance = metrics?.distance_m ?? 0;
  const seconds = metrics?.duration_s ?? 0;
  const summary =
    money.expenses !== null && money.payments !== null
      ? tripMoney(money.expenses, money.payments, members.map((member) => member.user_id), myId)
      : null;
  const started = session?.startedAt !== null;

  return (
    <Screen edges={['top', 'bottom']}>
      <ScreenHeader eyebrow="Fin del viaje" title="¡Habéis llegado!" />
      {error ? <Notice message={error} /> : null}
      {session === null && error === null ? <ActivityIndicator color={colors.primary} /> : null}

      {session ? (
        <>
          <CarHero car={session.car} code={session.nfcCode} overline="Viaje terminado">
            <Badge label={started ? 'Finalizado' : 'Cerrado sin salir'} tone={started ? 'success' : 'neutral'} />
          </CarHero>

          <View style={styles.grid}>
            <Stat icon="map-marker-distance" label="Distancia" value={formatKm(distance)} />
            <Stat icon="timer-outline" label="Duración" value={formatDuration(seconds)} />
            <Stat icon="account-group" label="Personas" value={String(members.length)} />
            <Stat icon="gas-station" label="Gasolina" value={summary ? formatEuros(summary.fuelCents) : '…'} />
          </View>

          {money.error ? <Notice message={money.error} /> : null}
          {summary ? (
            <SettlementCard money={summary} people={members} myId={myId} pay={{ payees: money.payees, onMarkPaid: money.markPaid }} />
          ) : null}

          <View style={styles.people}>
            <AppText variant="title">Quién iba</AppText>
            <View style={styles.avatars}>
              {members.map((member) => (
                <View key={member.user_id} style={styles.person}>
                  <Avatar kind={member.avatar_kind} value={member.avatar_value} size={56} label={member.display_name} />
                  <AppText variant="caption" numberOfLines={1} style={styles.center}>
                    {member.display_name}
                  </AppText>
                </View>
              ))}
            </View>
          </View>
        </>
      ) : null}

      <Button label="Volver al inicio" icon="home" size="lg" onPress={() => router.replace('/')} />
    </Screen>
  );
}

function Stat({ icon, label, value }: { icon: MciName; label: string; value: string }) {
  const { colors } = useTheme();
  const styles = useStyles(makeStyles);
  return (
    <View style={styles.stat} accessible accessibilityLabel={`${label}: ${value}`}>
      <MaterialCommunityIcons name={icon} size={22} color={colors.primary} />
      <AppText variant="title" numberOfLines={1} adjustsFontSizeToFit>
        {value}
      </AppText>
      <AppText variant="caption" color={colors.textSecondary}>
        {label}
      </AppText>
    </View>
  );
}

const makeStyles = (c: Palette) =>
  StyleSheet.create({
    grid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm + 4 },
    stat: { flexBasis: '47%', flexGrow: 1, padding: spacing.md, borderRadius: radius.lg, gap: 4, backgroundColor: c.surface },
    center: { textAlign: 'center' },
    people: { gap: spacing.md },
    avatars: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md },
    person: { width: 72, alignItems: 'center', gap: 4 },
  });
