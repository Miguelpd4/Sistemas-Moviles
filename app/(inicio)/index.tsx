import Ionicons from '@expo/vector-icons/Ionicons';
import { router } from 'expo-router';
import { memo, useState } from 'react';
import { Platform, Pressable, StyleSheet, View } from 'react-native';

import { ScanSheet } from '@/components/entrada/ScanSheet';
import { CurrentTripCard } from '@/components/inicio/CurrentTripCard';
import { AppText, Card, Notice, Screen, type IconName } from '@/components/ui';
import { useAuth } from '@/hooks/useAuth';
import { useCurrentTrip } from '@/hooks/useCurrentTrip';
import { useNfcScan } from '@/hooks/useNfcScan';
import { errorMessage } from '@/lib/errors';
import { getMyCar } from '@/services/supabase/cars';
import { startSession } from '@/services/supabase/sessions';
import { colors, radius, spacing } from '@/theme';

type ActionCardProps = {
  title: string;
  subtitle: string;
  icon: IconName;
  background: string;
  foreground: string;
  busy?: boolean;
  onPress: () => void;
};

const ActionCard = memo(function ActionCard({
  title,
  subtitle,
  icon,
  background,
  foreground,
  busy = false,
  onPress,
}: ActionCardProps) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${title}. ${subtitle}`}
      accessibilityState={{ busy }}
      disabled={busy}
      onPress={onPress}
      style={({ pressed }) => [
        styles.card,
        { backgroundColor: background },
        (pressed || busy) && styles.pressed,
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

/** Inicio (S1-08): viaje en curso, Crear viaje y Unirse. */
export default function InicioScreen() {
  const { user, profile, isAnonymous } = useAuth();
  const { trip } = useCurrentTrip();
  const nfc = useNfcScan();
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showScan, setShowScan] = useState(false);
  const [showJoinHelp, setShowJoinHelp] = useState(false);

  const createTrip = async () => {
    setError(null);
    // Sin cuenta o sin coche, Mi coche explica qué falta.
    if (isAnonymous || user === null) {
      router.push('/mi-coche');
      return;
    }
    setCreating(true);
    try {
      const car = await getMyCar(user.id);
      if (car === null) {
        router.push('/mi-coche');
        return;
      }
      const sessionId = await startSession(car.id);
      router.push({ pathname: '/conductor', params: { sessionId } });
    } catch (err) {
      setError(errorMessage(err, 'No se ha podido crear el viaje.'));
    } finally {
      setCreating(false);
    }
  };

  const scan = async () => {
    setShowScan(true);
    const code = await nfc.start();
    if (code !== null) {
      setShowScan(false);
      router.push({ pathname: '/c/[carCode]', params: { carCode: code } });
    }
  };

  const join = () => {
    setError(null);
    if (Platform.OS === 'android' && nfc.supported) {
      void scan();
    } else {
      setShowJoinHelp((visible) => !visible);
    }
  };

  const closeScan = () => {
    nfc.cancel();
    nfc.clearError();
    setShowScan(false);
  };

  const greeting = profile?.display_name ? `Hola, ${profile.display_name}` : 'Hola';

  return (
    <Screen>
      <View style={styles.header}>
        <AppText color={colors.textSecondary}>Toca. Sube. Viaja.</AppText>
        <AppText variant="display" accessibilityRole="header">
          {greeting}
        </AppText>
      </View>

      {trip ? <CurrentTripCard trip={trip} /> : null}
      {error !== null ? <Notice message={error} /> : null}

      <View style={styles.actions}>
        <ActionCard
          title="Crear viaje"
          subtitle="Comparte gastos y viaja juntos"
          icon="car-outline"
          background={colors.inverse}
          foreground={colors.textOnInverse}
          busy={creating}
          onPress={createTrip}
        />
        <ActionCard
          title="Unirse"
          subtitle="Toca la pegatina o escanea QR"
          icon="qr-code-outline"
          background={colors.primary}
          foreground={colors.textOnPrimary}
          onPress={join}
        />
      </View>

      {showJoinHelp ? (
        <Card>
          <AppText variant="heading">Cómo unirte</AppText>
          <AppText>Toca la pegatina del coche con el móvil desbloqueado, o escanea el QR del conductor con la cámara.</AppText>
        </Card>
      ) : null}

      <ScanSheet
        visible={showScan}
        scanning={nfc.scanning}
        error={nfc.error}
        onCancel={closeScan}
        onRetry={() => void scan()}
      />
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
