import Ionicons from '@expo/vector-icons/Ionicons';
import { router } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';

import { AppText } from '@/components/ui';
import type { CurrentTrip } from '@/services/supabase/sessions';
import { radius, spacing, useTheme } from '@/theme';

/** «Viaje en curso en el coche de X»: lleva a la sala o al Modo conductor (S1-08). */
export function CurrentTripCard({ trip }: { trip: CurrentTrip }) {
  const { colors } = useTheme();
  const isDriver = trip.role === 'conductor';
  const live = trip.status === 'en_curso';
  const title = isDriver ? trip.carName : `En el coche de ${trip.driverName}`;
  const action = isDriver ? 'Volver al Modo conductor' : 'Volver a la sala';

  const open = () => {
    if (isDriver) {
      router.push({ pathname: '/conductor', params: { sessionId: trip.sessionId } });
    } else {
      router.push({ pathname: '/sala/[sessionId]', params: { sessionId: trip.sessionId } });
    }
  };

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${live ? 'Viaje en marcha' : 'Viaje abierto'}. ${title}. ${action}`}
      onPress={open}
      style={({ pressed }) => [styles.card, { backgroundColor: pressed ? colors.primaryPressed : colors.primary }]}
    >
      <View style={styles.pulse}>
        <View style={[styles.dot, { backgroundColor: colors.textOnPrimary }]} />
      </View>
      <View style={styles.text}>
        <AppText variant="caption" color={colors.textOnPrimary}>
          {live ? 'Viaje en marcha' : 'Viaje abierto'}
        </AppText>
        <AppText variant="heading" color={colors.textOnPrimary} numberOfLines={1}>
          {title}
        </AppText>
        <AppText variant="bodyStrong" color={colors.textOnPrimary}>
          {action}
        </AppText>
      </View>
      <View style={[styles.arrow, { backgroundColor: colors.textOnPrimary }]}>
        <Ionicons name="arrow-forward" size={22} color={colors.primary} />
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    borderRadius: radius.lg,
    padding: spacing.lg,
  },
  pulse: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.3)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  dot: { width: 10, height: 10, borderRadius: 5 },
  text: { flex: 1, gap: 2 },
  arrow: {
    width: 44,
    height: 44,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
