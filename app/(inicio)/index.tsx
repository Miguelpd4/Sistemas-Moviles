import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import Ionicons from '@expo/vector-icons/Ionicons';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState, type ComponentProps } from 'react';
import { Platform, Pressable, StyleSheet, View } from 'react-native';

import { CarHero } from '@/components/coche/CarHero';
import { ScanSheet } from '@/components/entrada/ScanSheet';
import { CurrentTripCard } from '@/components/inicio/CurrentTripCard';
import { AppText, Avatar, Button, Glow, Notice, Screen } from '@/components/ui';
import { useAuth } from '@/hooks/useAuth';
import { useCurrentTrip } from '@/hooks/useCurrentTrip';
import { useMyCar } from '@/hooks/useMyCar';
import { useNfcScan } from '@/hooks/useNfcScan';
import { errorMessage } from '@/lib/errors';
import { carLook } from '@/services/supabase/cars';
import { startSession } from '@/services/supabase/sessions';
import { radius, spacing, useStyles, useTheme, type Palette } from '@/theme';

type MciName = ComponentProps<typeof MaterialCommunityIcons>['name'];

const HOW_IT_WORKS: readonly { icon: MciName; title: string; text: string }[] = [
  { icon: 'nfc-variant', title: 'Toca la pegatina', text: 'Acerca el móvil a la pegatina del coche. Sin cuentas ni descargas.' },
  { icon: 'seat-passenger', title: 'Elige tu asiento', text: 'Tu nombre, un personaje y dónde vas sentado.' },
  { icon: 'cash-multiple', title: 'Viajad y repartid', text: 'Música y juegos por el camino; al llegar, cada uno ve lo que le toca.' },
];

function today(): string {
  const text = new Date().toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' });
  return text.charAt(0).toUpperCase() + text.slice(1);
}

type TileProps = { icon: MciName; title: string; subtitle: string; onPress: () => void };

function Tile({ icon, title, subtitle, onPress }: TileProps) {
  const { colors } = useTheme();
  const styles = useStyles(makeStyles);
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${title}. ${subtitle}`}
      onPress={onPress}
      style={({ pressed }) => [styles.tile, { backgroundColor: pressed ? colors.surfaceStrong : colors.surface }]}
    >
      <View style={styles.tileIcon}>
        <MaterialCommunityIcons name={icon} size={24} color={colors.primary} />
      </View>
      <View>
        <AppText variant="heading">{title}</AppText>
        <AppText variant="caption" color={colors.textSecondary}>
          {subtitle}
        </AppText>
      </View>
    </Pressable>
  );
}

/** Inicio (S1-08): viaje en curso, el coche del conductor con «Crear viaje» y «Unirse». */
export default function InicioScreen() {
  const { colors } = useTheme();
  const styles = useStyles(makeStyles);
  const { user, profile, isAnonymous } = useAuth();
  const { trip } = useCurrentTrip();
  const { car, reload: reloadCar } = useMyCar();
  const nfc = useNfcScan();
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showScan, setShowScan] = useState(false);
  const [showJoinHelp, setShowJoinHelp] = useState(false);

  // Al volver de Mi coche se ve el coche recién registrado o editado.
  useFocusEffect(
    useCallback(() => {
      void reloadCar();
    }, [reloadCar]),
  );

  const isDriver = !isAnonymous && user !== null;
  const driverTrip = trip?.role === 'conductor' ? trip : null;

  const createTrip = async () => {
    setError(null);
    if (car === null) {
      router.push('/mi-coche');
      return;
    }
    setCreating(true);
    try {
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

  const firstName = profile?.display_name?.split(' ')[0];

  return (
    <Screen>
      <View style={styles.header}>
        <View style={styles.headerText}>
          <AppText variant="label" color={colors.primaryText}>
            {today()}
          </AppText>
          <AppText variant="display" accessibilityRole="header" numberOfLines={1}>
            {firstName ? `Hola, ${firstName}` : 'Hola'}
          </AppText>
        </View>
        {profile ? (
          <Pressable accessibilityRole="button" accessibilityLabel="Ir a tu perfil" onPress={() => router.push('/perfil')}>
            <Avatar kind={profile.avatar_kind} value={profile.avatar_value} size={48} />
          </Pressable>
        ) : null}
      </View>

      {trip ? <CurrentTripCard trip={trip} /> : null}
      {error !== null ? <Notice message={error} /> : null}

      {isDriver && car !== null && driverTrip === null ? (
        <CarHero car={carLook(car)} code={car.nfc_code} overline="Tu coche" extra={`${car.seats} plazas`}>
          <Button label="Crear viaje" icon="add" size="lg" loading={creating} onPress={createTrip} />
        </CarHero>
      ) : null}

      {isDriver && car === null ? (
        <View style={styles.promo}>
          <Glow cy={0.1} cx={0.85} />
          <MaterialCommunityIcons name="steering" size={40} color={colors.primary} />
          <AppText variant="title">Registra tu coche</AppText>
          <AppText color={colors.textSecondary}>
            Marca, modelo y color. Te damos el código de la pegatina y ya puedes crear viajes.
          </AppText>
          <Button label="Ir a Mi coche" icon="arrow-forward" onPress={() => router.push('/mi-coche')} />
        </View>
      ) : null}

      {isDriver ? (
        <View style={styles.tiles}>
          <Tile icon="nfc-variant" title="Unirse" subtitle="Pegatina o QR" onPress={join} />
          <Tile
            icon="history"
            title="Historial"
            subtitle="Tus viajes"
            onPress={() => router.push('/historial')}
          />
        </View>
      ) : (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Unirse a un coche. Toca la pegatina o escanea el QR del conductor."
          onPress={join}
          style={({ pressed }) => [styles.joinHero, pressed && styles.pressed]}
        >
          <Glow cy={0.15} />
          <View style={styles.nfcHalo}>
            <View style={styles.nfcCore}>
              <MaterialCommunityIcons name="nfc-variant" size={44} color={colors.textOnPrimary} />
            </View>
          </View>
          <AppText variant="display" style={styles.center}>
            Súbete a un coche
          </AppText>
          <AppText color={colors.textSecondary} style={styles.center}>
            Toca la pegatina del coche con el móvil o escanea el QR del conductor.
          </AppText>
          <View style={styles.joinButton}>
            <AppText variant="heading" color={colors.textOnPrimary}>
              Unirse
            </AppText>
            <Ionicons name="arrow-forward" size={20} color={colors.textOnPrimary} />
          </View>
        </Pressable>
      )}

      {showJoinHelp ? (
        <Notice
          tone="info"
          message="Con el móvil desbloqueado, acerca la parte de arriba a la pegatina del coche. También puedes escanear con la cámara el QR que aparece en el móvil del conductor."
        />
      ) : null}

      {!isDriver && trip === null ? (
        <View style={styles.how}>
          <AppText variant="title" accessibilityRole="header">
            Cómo funciona
          </AppText>
          {HOW_IT_WORKS.map((step, index) => (
            <View key={step.title} style={styles.step}>
              <View style={styles.stepIcon}>
                <MaterialCommunityIcons name={step.icon} size={24} color={colors.primary} />
              </View>
              <View style={styles.stepText}>
                <AppText variant="heading">
                  {index + 1}. {step.title}
                </AppText>
                <AppText variant="label" color={colors.textSecondary}>
                  {step.text}
                </AppText>
              </View>
            </View>
          ))}
          <Button label="¿Conduces? Registra tu coche" variant="ghost" icon="car-sport-outline" onPress={() => router.push('/mi-coche')} />
        </View>
      ) : null}

      <ScanSheet visible={showScan} scanning={nfc.scanning} error={nfc.error} onCancel={closeScan} onRetry={() => void scan()} />
    </Screen>
  );
}

const makeStyles = (c: Palette) =>
  StyleSheet.create({
    header: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, marginTop: spacing.sm, marginBottom: spacing.xs },
    headerText: { flex: 1, gap: 2 },
    promo: {
      gap: spacing.sm,
      padding: spacing.lg - 4,
      borderRadius: radius.lg,
      backgroundColor: c.surfaceRaised,
      borderWidth: 1,
      borderColor: c.border,
      overflow: 'hidden',
    },
    tiles: { flexDirection: 'row', gap: spacing.sm + 4 },
    tile: { flex: 1, minHeight: 124, borderRadius: radius.lg, padding: spacing.md, justifyContent: 'space-between' },
    tileIcon: {
      width: 44,
      height: 44,
      borderRadius: radius.sm,
      backgroundColor: c.primarySoft,
      alignItems: 'center',
      justifyContent: 'center',
    },
    joinHero: {
      alignItems: 'center',
      gap: spacing.sm,
      paddingHorizontal: spacing.lg,
      paddingTop: spacing.xl,
      paddingBottom: spacing.lg,
      borderRadius: radius.lg,
      backgroundColor: c.surfaceRaised,
      borderWidth: 1,
      borderColor: c.border,
      overflow: 'hidden',
    },
    pressed: { opacity: 0.92 },
    nfcHalo: {
      width: 136,
      height: 136,
      borderRadius: 68,
      backgroundColor: c.primarySoft,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: spacing.md,
    },
    nfcCore: {
      width: 88,
      height: 88,
      borderRadius: 44,
      backgroundColor: c.primary,
      alignItems: 'center',
      justifyContent: 'center',
    },
    center: { textAlign: 'center' },
    joinButton: {
      marginTop: spacing.md,
      alignSelf: 'stretch',
      minHeight: 60,
      borderRadius: radius.md,
      backgroundColor: c.primary,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: spacing.sm,
    },
    how: { gap: spacing.md, marginTop: spacing.md },
    step: { flexDirection: 'row', gap: spacing.md, alignItems: 'center' },
    stepIcon: {
      width: 52,
      height: 52,
      borderRadius: radius.sm,
      backgroundColor: c.surface,
      alignItems: 'center',
      justifyContent: 'center',
    },
    stepText: { flex: 1, gap: 2 },
  });
