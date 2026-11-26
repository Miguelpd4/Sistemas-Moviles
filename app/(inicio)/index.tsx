import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import Ionicons from '@expo/vector-icons/Ionicons';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useCallback, useMemo, useState, type ComponentProps } from 'react';
import { Platform, Pressable, StyleSheet, View } from 'react-native';

import { CarHero } from '@/components/coche/CarHero';
import { ScanSheet } from '@/components/entrada/ScanSheet';
import { TripCard } from '@/components/historial/TripCard';
import { AccountsSummary } from '@/components/inicio/AccountsSummary';
import { CurrentTripCard } from '@/components/inicio/CurrentTripCard';
import { QuickAction } from '@/components/inicio/QuickAction';
import { AppText, Avatar, BrandMark, Button, Glow, IconTile, Notice, PressableScale, Screen, SectionHeader } from '@/components/ui';
import { useAccounts } from '@/hooks/useAccounts';
import { useAuth } from '@/hooks/useAuth';
import { useCurrentTrip } from '@/hooks/useCurrentTrip';
import { useHistory } from '@/hooks/useHistory';
import { useMyCar } from '@/hooks/useMyCar';
import { useNfcScan } from '@/hooks/useNfcScan';
import { summarizeAccounts } from '@/lib/accounts';
import { errorMessage } from '@/lib/errors';
import { carLook } from '@/services/supabase/cars';
import { startSession } from '@/services/supabase/sessions';
import { radius, spacing, useStyles, useTheme, type Palette } from '@/theme';

type MciName = ComponentProps<typeof MaterialCommunityIcons>['name'];

const HOW_IT_WORKS: readonly { icon: MciName; tint: 'teal' | 'violet' | 'green'; title: string; text: string }[] = [
  { icon: 'nfc-variant', tint: 'teal', title: 'Toca la pegatina', text: 'Acerca el móvil a la pegatina del coche. Sin cuentas ni descargas.' },
  { icon: 'seat-passenger', tint: 'violet', title: 'Elige tu asiento', text: 'Tu nombre, un personaje y dónde vas sentado.' },
  { icon: 'cash-multiple', tint: 'green', title: 'Viajad y repartid', text: 'Música y juegos por el camino; al llegar, cada uno ve lo que le toca.' },
];

function today(): string {
  const text = new Date().toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' });
  return text.charAt(0).toUpperCase() + text.slice(1);
}

/**
 * Inicio (S1-08): saludo, el viaje en marcha (lo más visible), el coche del conductor con «Crear
 * viaje» o el gran botón de «Unirse» para pasajeros, lo pendiente de pagar o cobrar, accesos
 * rápidos y los últimos viajes.
 */
export default function InicioScreen() {
  const { colors } = useTheme();
  const styles = useStyles(makeStyles);
  const { user, profile, isAnonymous } = useAuth();
  const { aviso } = useLocalSearchParams<{ aviso?: string }>();
  const { trip } = useCurrentTrip();
  const { car, reload: reloadCar } = useMyCar();
  const nfc = useNfcScan();
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showScan, setShowScan] = useState(false);
  const [showJoinHelp, setShowJoinHelp] = useState(false);
  const myId = user?.id ?? null;
  const accounts = useAccounts(myId);
  const money = useMemo(
    () => (accounts.data && myId ? summarizeAccounts(accounts.data.payments, myId) : null),
    [accounts.data, myId],
  );
  const history = useHistory(myId);
  const recent = useMemo(() => (history.trips ?? []).slice(0, 2), [history.trips]);
  const openTrip = useCallback((id: string) => router.push(`/resumen/${id}`), []);

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
          <View style={styles.brandRow}>
            <BrandMark size={22} />
            <AppText variant="overline" color={colors.textSecondary}>
              {today()}
            </AppText>
          </View>
          <AppText variant="display" accessibilityRole="header" numberOfLines={1}>
            {firstName ? `Hola, ${firstName}` : '¡Hola!'}
          </AppText>
        </View>
        {profile ? (
          <Pressable accessibilityRole="button" accessibilityLabel="Ir a tu perfil" onPress={() => router.push('/perfil')} style={styles.avatarRing}>
            <Avatar kind={profile.avatar_kind} value={profile.avatar_value} size={46} />
          </Pressable>
        ) : null}
      </View>

      {aviso === 'fuera' && trip === null ? <Notice tone="info" message="Ya no estás en ese viaje." /> : null}
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
          <IconTile icon="steering" size={52} />
          <AppText variant="title">Registra tu coche</AppText>
          <AppText color={colors.textSecondary}>
            Marca, modelo y color. Te damos el código de la pegatina y ya puedes crear viajes.
          </AppText>
          <Button label="Ir a Mi coche" icon="arrow-forward" onPress={() => router.push('/mi-coche')} />
        </View>
      ) : null}

      {!isDriver && trip === null ? (
        <PressableScale
          accessibilityRole="button"
          accessibilityLabel="Unirse a un coche. Toca la pegatina o escanea el QR del conductor."
          onPress={join}
          haptic
          scaleTo={0.985}
          style={styles.joinHero}
        >
          <Glow cy={0.2} />
          <View style={styles.nfcHalo}>
            <View style={styles.nfcRing}>
              <View style={styles.nfcCore}>
                <MaterialCommunityIcons name="nfc-variant" size={44} color={colors.textOnPrimary} />
              </View>
            </View>
          </View>
          <AppText variant="overline" color={colors.primaryText}>
            Toca. Sube. Viaja.
          </AppText>
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
        </PressableScale>
      ) : null}

      {showJoinHelp ? (
        <Notice
          tone="info"
          message="Con el móvil desbloqueado, acerca la parte de arriba a la pegatina del coche. También puedes escanear con la cámara el QR que aparece en el móvil del conductor."
        />
      ) : null}

      {money && (money.oweCents > 0 || money.owedCents > 0) ? <AccountsSummary oweCents={money.oweCents} owedCents={money.owedCents} /> : null}

      <View style={styles.grid}>
        {isDriver || trip !== null ? <QuickAction icon="nfc-variant" tint="teal" title="Unirse" subtitle="Pegatina o QR" onPress={join} /> : null}
        <QuickAction icon="history" tint="blue" title="Historial" subtitle="Tus viajes" onPress={() => router.push('/historial')} />
        <QuickAction icon="wallet-outline" tint="green" title="Cuentas" subtitle="Deudas y pagos" onPress={() => router.push('/cuentas')} />
        {isDriver ? (
          <QuickAction icon="car-side" tint="violet" title="Mi coche" subtitle="Pegatina y datos" onPress={() => router.push('/mi-coche')} />
        ) : (
          <QuickAction icon="account-circle-outline" tint="violet" title="Perfil" subtitle="Recuerdos y estadísticas" onPress={() => router.push('/perfil')} />
        )}
      </View>

      {recent.length > 0 ? (
        <View style={styles.section}>
          <SectionHeader title="Viajes recientes" aside="Ver todo" onAction={() => router.push('/historial')} />
          {recent.map((item) => (
            <TripCard key={item.id} trip={item} onPress={openTrip} />
          ))}
        </View>
      ) : null}

      {!isDriver && trip === null ? (
        <View style={styles.section}>
          <SectionHeader overline="Sin registrarte" title="Cómo funciona" />
          {HOW_IT_WORKS.map((step, index) => (
            <View key={step.title} style={styles.step}>
              <IconTile icon={step.icon} tint={step.tint} size={48} />
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

      <View style={styles.footer} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
        <BrandMark size={18} />
        <AppText variant="caption" color={colors.textTertiary}>
          COPI · Toca. Sube. Viaja.
        </AppText>
      </View>

      <ScanSheet visible={showScan} scanning={nfc.scanning} error={nfc.error} onCancel={closeScan} onRetry={() => void scan()} />
    </Screen>
  );
}

const makeStyles = (c: Palette) =>
  StyleSheet.create({
    header: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, marginTop: spacing.sm, marginBottom: spacing.xs },
    headerText: { flex: 1, gap: spacing.xs },
    brandRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
    avatarRing: { padding: 3, borderRadius: 999, borderWidth: 2, borderColor: c.primary },
    promo: {
      gap: spacing.sm,
      padding: spacing.lg - 4,
      borderRadius: radius.lg,
      backgroundColor: c.surfaceRaised,
      borderWidth: 1,
      borderColor: c.border,
      overflow: 'hidden',
    },
    grid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm + 4 },
    section: { gap: spacing.sm + 4, marginTop: spacing.sm },
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
    nfcHalo: {
      width: 164,
      height: 164,
      borderRadius: 82,
      backgroundColor: c.primarySoft,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: spacing.sm,
    },
    nfcRing: {
      width: 120,
      height: 120,
      borderRadius: 60,
      borderWidth: 1.5,
      borderColor: c.primary,
      alignItems: 'center',
      justifyContent: 'center',
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
      borderRadius: radius.pill,
      backgroundColor: c.primary,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: spacing.sm,
    },
    step: { flexDirection: 'row', gap: spacing.md, alignItems: 'center' },
    stepText: { flex: 1, gap: 2 },
    footer: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.sm, marginTop: spacing.lg, opacity: 0.8 },
  });
