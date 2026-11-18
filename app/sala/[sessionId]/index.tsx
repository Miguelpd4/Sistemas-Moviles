import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { CarHero } from '@/components/coche/CarHero';
import { MemberRow } from '@/components/sala/MemberRow';
import { PendingList } from '@/components/sala/PendingList';
import { RoomSettings } from '@/components/sala/RoomSettings';
import { SeatMap, type SeatOccupant } from '@/components/sala/SeatMap';
import { AppText, Badge, Button, Glow, Notice, Screen, Sheet } from '@/components/ui';
import { useSession } from '@/hooks/useSession';
import { errorMessage } from '@/lib/errors';
import { leaveSession, setCopilot } from '@/services/supabase/sessions';
import { radius, spacing, useStyles, useTheme, type Palette } from '@/theme';
import type { SessionMember } from '@/types/session';

/**
 * Pestaña Sala (S2-03): el coche, quién va en cada asiento y quién está conectado. El conductor
 * y el copiloto aceptan a quien espera; el conductor nombra copiloto. Los pasajeros pueden salir.
 */
export default function SalaScreen() {
  const { colors } = useTheme();
  const styles = useStyles(makeStyles);
  const { sessionId, session, members, pending, me, myId, isHost, isAdmin, online, status, loading, error } = useSession();
  const [menuFor, setMenuFor] = useState<SessionMember | null>(null);
  const [confirmLeave, setConfirmLeave] = useState(false);
  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  const occupants = useMemo(() => {
    const bySeat: Record<number, SeatOccupant> = {};
    for (const member of members) {
      if (member.seat !== null) {
        bySeat[member.seat] = { name: member.display_name, avatarKind: member.avatar_kind, avatarValue: member.avatar_value };
      }
    }
    return bySeat;
  }, [members]);

  if (loading && session === null) {
    return (
      <Screen>
        <ActivityIndicator color={colors.primary} style={styles.loader} />
      </Screen>
    );
  }

  // Seguridad vial: con el viaje en marcha, el conductor no gestiona la sala.
  if (isHost && session?.status === 'en_curso') {
    return (
      <Screen>
        <View style={styles.driving}>
          <Glow cy={0.2} />
          <MaterialCommunityIcons name="steering" size={56} color={colors.primary} />
          <AppText variant="display" style={styles.center}>
            Estás conduciendo
          </AppText>
          <AppText color={colors.textSecondary} style={styles.center}>
            Tu copiloto gestiona la sala. Tú, a la carretera.
          </AppText>
          <Button
            label="Volver al Modo conductor"
            icon="speedometer-outline"
            size="lg"
            onPress={() => router.replace({ pathname: '/conductor', params: { sessionId } })}
          />
        </View>
      </Screen>
    );
  }

  const driver = members.find((member) => member.role === 'conductor');
  const live = session?.status === 'en_curso';
  const connected = members.filter((member) => online.has(member.user_id)).length;

  const changeCopilot = async (userId: string | null) => {
    setBusy(true);
    setActionError(null);
    try {
      await setCopilot(sessionId, userId);
      setMenuFor(null);
    } catch (err) {
      setActionError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  const leave = async () => {
    setBusy(true);
    setActionError(null);
    try {
      await leaveSession(sessionId);
      setConfirmLeave(false);
      router.replace('/');
    } catch (err) {
      setActionError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  };

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
            <Badge label={`${members.length} ${members.length === 1 ? 'persona' : 'personas'}`} />
            <Badge label={`${connected} conectados`} tone={connected > 0 ? 'success' : 'neutral'} />
          </View>
        </CarHero>
      ) : null}

      {error ? <Notice message={error} /> : null}
      {status === 'sin_conexion' ? <Notice tone="info" message="Reconectando con la sala…" /> : null}
      {status === 'sin_permiso' ? (
        <Notice message="No se puede escuchar la sala en vivo. Revisa que sigues dentro del viaje." />
      ) : null}

      {isAdmin ? <PendingList sessionId={sessionId} pending={pending} /> : null}

      <View style={styles.section}>
        <AppText variant="title" accessibilityRole="header">
          Quién va dónde
        </AppText>
        <SeatMap
          seats={session?.seats ?? 5}
          taken={Object.keys(occupants).map(Number)}
          occupants={occupants}
          paint={session?.car.color ?? null}
        />
      </View>

      <View style={styles.section}>
        <AppText variant="title" accessibilityRole="header">
          En el coche
        </AppText>
        {members.map((member) => (
          <MemberRow
            key={member.user_id}
            member={member}
            online={online.has(member.user_id)}
            isMe={member.user_id === myId}
            onMenu={isHost && member.role !== 'conductor' ? setMenuFor : undefined}
          />
        ))}
      </View>

      {isAdmin && session ? <RoomSettings sessionId={sessionId} joinMode={session.joinMode} /> : null}

      {actionError ? <Notice message={actionError} /> : null}

      {isHost ? (
        <Button
          label="Ir al Modo conductor"
          icon="speedometer-outline"
          variant="secondary"
          onPress={() => router.push({ pathname: '/conductor', params: { sessionId } })}
        />
      ) : me ? (
        <Button label="Salir del viaje" icon="exit-outline" variant="danger" onPress={() => setConfirmLeave(true)} />
      ) : null}

      {/* Espacio para que «Pedir parada» no tape el final. */}
      <View style={styles.bottomSpace} />

      <Sheet
        visible={menuFor !== null}
        title={menuFor?.display_name ?? ''}
        description={menuFor?.role === 'copiloto' ? 'Es tu copiloto: gestiona la sala mientras conduces.' : 'El copiloto acepta pasajeros, cambia ajustes y lanza juegos.'}
        onClose={() => setMenuFor(null)}
      >
        {menuFor?.role === 'copiloto' ? (
          <Button label="Quitar copiloto" variant="danger" loading={busy} onPress={() => void changeCopilot(null)} />
        ) : (
          <Button
            label="Nombrar copiloto"
            icon="star"
            loading={busy}
            onPress={() => menuFor && void changeCopilot(menuFor.user_id)}
          />
        )}
        <Button label="Cancelar" variant="ghost" onPress={() => setMenuFor(null)} />
      </Sheet>

      <Sheet
        visible={confirmLeave}
        title="¿Salir del viaje?"
        description="Dejarás tu asiento libre y no verás la música ni los juegos. Podrás volver a entrar tocando la pegatina."
        onClose={() => setConfirmLeave(false)}
      >
        <Button label="Salir del viaje" variant="danger" loading={busy} onPress={() => void leave()} />
        <Button label="Quedarme" variant="ghost" onPress={() => setConfirmLeave(false)} />
      </Sheet>
    </Screen>
  );
}

const makeStyles = (c: Palette) =>
  StyleSheet.create({
    loader: { marginTop: spacing.xxl },
    driving: {
      alignItems: 'center',
      gap: spacing.md,
      padding: spacing.lg,
      paddingTop: spacing.xl,
      marginTop: spacing.lg,
      borderRadius: radius.lg,
      backgroundColor: c.surfaceRaised,
      borderWidth: 1,
      borderColor: c.border,
      overflow: 'hidden',
    },
    center: { textAlign: 'center' },
    badges: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs },
    section: { gap: spacing.sm + 4, marginTop: spacing.sm },
    bottomSpace: { height: 72 },
  });
