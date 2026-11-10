import Ionicons from '@expo/vector-icons/Ionicons';
import { router } from 'expo-router';
import { memo } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { AppText, Screen, type IconName } from '@/components/ui';
import { colors, radius, spacing } from '@/theme';

type ActionCardProps = {
  title: string;
  subtitle: string;
  icon: IconName;
  background: string;
  foreground: string;
  onPress: () => void;
};

const ActionCard = memo(function ActionCard({
  title,
  subtitle,
  icon,
  background,
  foreground,
  onPress,
}: ActionCardProps) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${title}. ${subtitle}`}
      onPress={onPress}
      style={({ pressed }) => [
        styles.card,
        { backgroundColor: background },
        pressed && styles.pressed,
      ]}
    >
      <Ionicons name={icon} size={40} color={foreground} />
      <View style={styles.cardText}>
        <AppText variant="title" color={foreground}>
          {title}
        </AppText>
        <AppText variant="caption" color={foreground}>
          {subtitle}
        </AppText>
      </View>
    </Pressable>
  );
});

// TODO(ui): tarjeta "Viaje en curso", "Último viaje" y "Deudas pendientes" según docs/diseno/1_inicio.jpg.
export default function InicioScreen() {
  return (
    <Screen>
      <View style={styles.header}>
        <AppText color={colors.textSecondary}>Buen viaje siempre</AppText>
        <AppText variant="display" accessibilityRole="header">
          Hola
        </AppText>
      </View>
      <View style={styles.actions}>
        <ActionCard
          title="Crear viaje"
          subtitle="Comparte gastos y viaja juntos"
          icon="car-outline"
          background={colors.inverse}
          foreground={colors.textOnInverse}
          onPress={() => router.push('/conductor')}
        />
        <ActionCard
          title="Unirse"
          subtitle="Toca la pegatina o escanea QR"
          icon="qr-code-outline"
          background={colors.primary}
          foreground={colors.textOnPrimary}
          onPress={() => router.push('/c/DEMO')}
        />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: { gap: spacing.xs, marginBottom: spacing.sm },
  actions: { flexDirection: 'row', gap: spacing.md },
  card: {
    flex: 1,
    minHeight: 180,
    borderRadius: radius.lg,
    padding: spacing.lg,
    justifyContent: 'space-between',
  },
  cardText: { gap: spacing.xs },
  pressed: { opacity: 0.9, transform: [{ scale: 0.98 }] },
});
