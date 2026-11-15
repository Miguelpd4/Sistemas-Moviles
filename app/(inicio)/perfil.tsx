import Ionicons from '@expo/vector-icons/Ionicons';
import { router } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';

import { AppText, Avatar, Badge, Button, EmptyState, Glow, Screen, ScreenHeader, type IconName } from '@/components/ui';
import { useAuth } from '@/hooks/useAuth';
import { radius, spacing, useStyles, useTheme, type Palette, type ThemePreference } from '@/theme';

const APPEARANCE: readonly { value: ThemePreference; label: string; icon: IconName }[] = [
  { value: 'oscuro', label: 'Oscuro', icon: 'moon' },
  { value: 'claro', label: 'Claro', icon: 'sunny' },
  { value: 'sistema', label: 'Sistema', icon: 'phone-portrait-outline' },
];

/**
 * Perfil: quién eres, la apariencia de la app y, en el Sprint 4, los recuerdos
 * (historial, estadísticas y muro de fotos). En desarrollo muestra las pruebas técnicas.
 */
export default function PerfilScreen() {
  const { colors, preference, setPreference } = useTheme();
  const styles = useStyles(makeStyles);
  const { profile, isAnonymous } = useAuth();
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

      <EmptyState
        icon="images-outline"
        title="Tus recuerdos"
        description="Viajes, estadísticas y las fotos de cada viaje durante 7 días. Llega en el Sprint 4."
      />

      {isAnonymous ? (
        <Button label="¿Conduces? Registra tu coche" variant="ghost" icon="car-sport-outline" onPress={() => router.push('/mi-coche')} />
      ) : null}

      {__DEV__ ? (
        <View style={styles.section}>
          <AppText variant="heading">Pruebas técnicas</AppText>
          <AppText variant="caption" color={colors.textSecondary}>
            Solo se ven en desarrollo.
          </AppText>
          <Button label="Prueba de Spotify" variant="secondary" icon="musical-notes-outline" onPress={() => router.push('/dev/spotify')} />
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
