import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState, type ComponentProps } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { CarHero } from '@/components/coche/CarHero';
import { AppText, Avatar, Badge, Button, Glow, Notice, Screen, ScreenHeader } from '@/components/ui';
import { errorMessage } from '@/lib/errors';
import { formatDuration, formatEuros, formatKm } from '@/lib/format';
import { fuelCostCents, splitEqually } from '@/lib/split';
import { getSessionMembers, getSessionWithCar, type SessionWithCar } from '@/services/supabase/sessions';
import { getTripMetrics, type TripMetrics } from '@/services/supabase/trip';
import { radius, spacing, useStyles, useTheme, type Palette } from '@/theme';
import type { SessionMember } from '@/types/session';

type MciName = ComponentProps<typeof MaterialCommunityIcons>['name'];

/**
 * Resumen del viaje, primera versión (Sprint 2): distancia, tiempo, quién iba y la gasolina.
 * El reparto con pagos, la canción del viaje y el ganador llegan en el Sprint 3.
 */
export default function ResumenScreen() {
  const { colors } = useTheme();
  const styles = useStyles(makeStyles);
  const { sessionId } = useLocalSearchParams<{ sessionId: string }>();
  const [session, setSession] = useState<SessionWithCar | null>(null);
  const [members, setMembers] = useState<SessionMember[]>([]);
  const [metrics, setMetrics] = useState<TripMetrics | null>(null);
  const [error, setError] = useState<string | null>(null);

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
  const cost = session?.fuelPriceEurL ? fuelCostCents(distance, session.consumptionL100km, session.fuelPriceEurL) : 0;
  const share = members.length > 0 ? Math.max(...Object.values(splitEqually(cost, members.map((member) => member.user_id)))) : 0;
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
            <Stat icon="gas-station" label="Gasolina" value={formatEuros(cost)} />
          </View>

          <View style={styles.share}>
            <Glow cy={0.9} />
            <AppText color={colors.textSecondary}>A cada uno le toca (a partes iguales)</AppText>
            <AppText variant="hero" color={colors.primaryText}>
              {formatEuros(share)}
            </AppText>
            <AppText variant="caption" color={colors.textTertiary} style={styles.center}>
              Los pagos, los peajes y el parking llegan en la próxima versión.
            </AppText>
          </View>

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
    share: {
      alignItems: 'center',
      gap: spacing.xs,
      padding: spacing.lg,
      borderRadius: radius.lg,
      backgroundColor: c.surfaceRaised,
      borderWidth: 1,
      borderColor: c.border,
      overflow: 'hidden',
    },
    center: { textAlign: 'center' },
    people: { gap: spacing.md },
    avatars: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md },
    person: { width: 72, alignItems: 'center', gap: 4 },
  });
