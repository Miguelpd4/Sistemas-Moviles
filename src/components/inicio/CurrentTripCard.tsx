import { router } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { AppText, Button, Glow, IconTile, LiveDot, PressableScale } from '@/components/ui';
import type { CurrentTrip } from '@/services/supabase/sessions';
import { radius, spacing, useStyles, useTheme, type Palette } from '@/theme';

/**
 * «Viaje en marcha»: la tarjeta más visible de Inicio cuando estás en un viaje. Lleva a la sala o
 * al Modo conductor (S1-08).
 */
export function CurrentTripCard({ trip }: { trip: CurrentTrip }) {
  const { colors } = useTheme();
  const styles = useStyles(makeStyles);
  const isDriver = trip.role === 'conductor';
  const live = trip.status === 'en_curso';
  const title = isDriver ? trip.carName : `En el coche de ${trip.driverName}`;
  const action = isDriver ? 'Volver al Modo conductor' : 'Volver a la sala';
  const detail = isDriver
    ? live
      ? 'Conduces tú. Tu copiloto lleva la sala.'
      : 'Esperando a que suban los pasajeros.'
    : live
      ? `Vas en ${trip.carName}. Música, juegos y el reparto, en la sala.`
      : `${trip.carName} aún no ha salido.`;

  const open = () => {
    if (isDriver) router.push({ pathname: '/conductor', params: { sessionId: trip.sessionId } });
    else router.push({ pathname: '/sala/[sessionId]', params: { sessionId: trip.sessionId } });
  };

  return (
    <PressableScale
      accessibilityRole="button"
      accessibilityLabel={`${live ? 'Viaje en marcha' : 'Viaje abierto'}. ${title}. ${action}`}
      onPress={open}
      haptic
      scaleTo={0.985}
      style={styles.card}
    >
      <Glow cy={0} cx={0.9} />
      <View style={styles.top}>
        <View style={styles.status}>
          <LiveDot color={live ? colors.success : colors.warning} />
          <AppText variant="overline" color={live ? colors.success : colors.warning}>
            {live ? 'En marcha' : 'Viaje abierto'}
          </AppText>
        </View>
        <IconTile icon={isDriver ? 'steering' : 'seat-passenger'} size={40} />
      </View>
      <AppText variant="title" numberOfLines={2}>
        {title}
      </AppText>
      <AppText color={colors.textSecondary}>{detail}</AppText>
      <View style={styles.action} pointerEvents="none" accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
        <Button label={action} icon="arrow-forward" size="lg" />
      </View>
    </PressableScale>
  );
}

const makeStyles = (c: Palette) =>
  StyleSheet.create({
    card: {
      gap: spacing.sm,
      padding: spacing.lg - 4,
      borderRadius: radius.lg,
      backgroundColor: c.surfaceRaised,
      borderWidth: 1.5,
      borderColor: c.primary,
      overflow: 'hidden',
    },
    top: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    status: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
    action: { marginTop: spacing.sm },
  });
