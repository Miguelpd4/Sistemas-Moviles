import Ionicons from '@expo/vector-icons/Ionicons';
import { router } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';

import { AppText, Avatar, Badge, Button, EmptyState, Glow, Screen, ScreenHeader, type IconName } from '@/components/ui';
import { MyMemories } from '@/components/perfil/MyMemories';
import { StatsCard } from '@/components/perfil/StatsCard';
import { useAuth } from '@/hooks/useAuth';
import { useHistory } from '@/hooks/useHistory';
import { useStats } from '@/hooks/useStats';
import { radius, spacing, useStyles, useTheme, type Palette, type ThemePreference } from '@/theme';

const APPEARANCE: readonly { value: ThemePreference; label: string; icon: IconName }[] = [
  { value: 'oscuro', label: 'Oscuro', icon: 'moon' },
  { value: 'claro', label: 'Claro', icon: 'sunny' },
  { value: 'sistema', label: 'Sistema', icon: 'phone-portrait-outline' },
];

/**
 * Perfil: quién eres, tus estadísticas y tus recuerdos (las fotos de tus viajes durante 7 días,
 * #34), la apariencia de la app y las pruebas técnicas.
 */
export default function PerfilScreen() {
  const { colors, preference, setPreference } = useTheme();
  const styles = useStyles(makeStyles);
  const { profile, isAnonymous, user } = useAuth();
  const myId = user?.id ?? null;
  const { trips, totals } = useHistory(myId);
  const { stats } = useStats(myId, trips);
  const name = profile?.display_name || 'Sin nombre todavía';

  return (
    <Screen>
      <ScreenHeader title="Perfil" />

      <View style={styles.identity}>
        <Glow cy={0.35} />
        {profile ? (
          <View style={styles.ring}>
            <Avatar kind={profile.avatar_kind} value={profile.avatar_value} size={108} label={name} />
          </View>
        ) : null}
        <AppText variant="title" style={styles.center}>
          {name}
        </AppText>
        <Badge label={isAnonymous ? 'Pasajero' : 'Conductor'} tone={isAnonymous ? 'neutral' : 'primary'} />
        {isAnonymous ? (
          <AppText variant="label" color={colors.textSecondary} style={styles.center}>
            Tu nombre y tu personaje se guardan en este móvil para el próximo viaje.
          </AppText>
        ) : null}
      </View>

      {myId !== null && totals && totals.trips > 0 && stats ? <StatsCard totals={totals} stats={stats} /> : null}
      {myId !== null && trips !== null && trips.length === 0 ? (
        <EmptyState
          icon="stats-chart-outline"
          title="Tus estadísticas"
          description="Cuando termines tu primer viaje verás aquí tus kilómetros, el CO₂ ahorrado, tus juegos y tu música."
        />
      ) : null}
      {myId !== null ? <MyMemories myId={myId} /> : null}

      <View style={styles.section}>
        <AppText variant="heading" accessibilityRole="header">
          Apariencia
        </AppText>
        <View style={styles.segment} accessibilityRole="radiogroup" accessibilityLabel="Apariencia">
          {APPEARANCE.map((option) => {
            const selected = preference === option.value;
            return (
              <Pressable
                key={option.value}
                accessibilityRole="radio"
                accessibilityState={{ checked: selected }}
                accessibilityLabel={option.label}
                onPress={() => setPreference(option.value)}
                style={[styles.segmentItem, selected && styles.segmentSelected]}
              >
                <Ionicons name={option.icon} size={20} color={selected ? colors.textOnPrimary : colors.textSecondary} />
                <AppText variant="label" color={selected ? colors.textOnPrimary : colors.text}>
                  {option.label}
                </AppText>
              </Pressable>
            );
          })}
        </View>
        <AppText variant="caption" color={colors.textTertiary}>
          El Modo conductor siempre es oscuro para no deslumbrar.
        </AppText>
      </View>

      {isAnonymous ? (
        <Button label="¿Conduces? Registra tu coche" variant="ghost" icon="car-sport-outline" onPress={() => router.push('/mi-coche')} />
      ) : null}

      {/* Prueba de YouTube (#54): también en la versión release y en la web, para probarla en el móvil. */}
      <View style={styles.section}>
        <AppText variant="heading">Música con YouTube (prueba)</AppText>
        <AppText variant="caption" color={colors.textSecondary}>
          Busca una canción y comprueba que suena dentro de COPI, sin cuentas ni otras apps.
        </AppText>
        <Button label="Prueba de YouTube" variant="secondary" icon="logo-youtube" onPress={() => router.push('/dev/youtube')} />
      </View>

      {__DEV__ ? (
        <View style={styles.section}>
          <AppText variant="heading">Pruebas técnicas</AppText>
          <AppText variant="caption" color={colors.textSecondary}>
            Solo se ven en desarrollo.
          </AppText>
          <Button label="Prueba de GPS y carburantes" variant="secondary" icon="navigate-outline" onPress={() => router.push('/dev/gps')} />
          <Button
            label="Abrir la pegatina DEMO2345"
            variant="secondary"
            icon="radio-outline"
            onPress={() => router.push({ pathname: '/c/[carCode]', params: { carCode: 'DEMO2345' } })}
          />
        </View>
      ) : null}
    </Screen>
  );
}

const makeStyles = (c: Palette) =>
  StyleSheet.create({
    identity: {
      alignItems: 'center',
      gap: spacing.sm,
      paddingVertical: spacing.lg,
      paddingHorizontal: spacing.lg,
      borderRadius: radius.lg,
      backgroundColor: c.surfaceRaised,
      borderWidth: 1,
      borderColor: c.border,
      overflow: 'hidden',
    },
    ring: { padding: 5, borderRadius: radius.pill, borderWidth: 3, borderColor: c.primary, marginBottom: spacing.xs },
    center: { textAlign: 'center' },
    section: { gap: spacing.sm + 4, padding: spacing.md + 4, borderRadius: radius.lg, backgroundColor: c.surface },
    segment: { flexDirection: 'row', gap: 6, padding: 6, borderRadius: radius.md, backgroundColor: c.background },
    segmentItem: {
      flex: 1,
      minHeight: 64,
      borderRadius: radius.sm,
      alignItems: 'center',
      justifyContent: 'center',
      gap: 4,
    },
    segmentSelected: { backgroundColor: c.primary },
  });
