import Ionicons from '@expo/vector-icons/Ionicons';
import { router } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';

import { AppText } from '@/components/ui';
import type { CurrentTrip } from '@/services/supabase/sessions';
import { colors, radius, spacing } from '@/theme';

/** «Viaje en curso en el coche de X»: lleva a la sala o al Modo conductor (S1-08). */
export function CurrentTripCard({ trip }: { trip: CurrentTrip }) {
  const isDriver = trip.role === 'conductor';
  const title = isDriver ? 'Tienes un viaje abierto' : `Viaje en curso en el coche de ${trip.driverName}`;
  const subtitle = isDriver ? `${trip.carName} · Volver al Modo conductor` : `${trip.carName} · Volver a la sala`;

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
      accessibilityLabel={`${title}. ${subtitle}`}
      onPress={open}
      style={({ pressed }) => [styles.card, pressed && styles.pressed]}
    >
      <View style={styles.dot} />
      <View style={styles.text}>
        <AppText variant="bodyStrong" color={colors.textOnPrimary}>
          {title}
        </AppText>
        <AppText variant="caption" color={colors.textOnPrimary}>
          {subtitle}
        </AppText>
      </View>
      <Ionicons name="chevron-forward" size={24} color={colors.textOnPrimary} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.primary,
    borderRadius: radius.lg,
    padding: spacing.lg,
  },
  pressed: { opacity: 0.9 },
  dot: { width: 12, height: 12, borderRadius: 6, backgroundColor: colors.textOnPrimary },
  text: { flex: 1, gap: 2 },
});
