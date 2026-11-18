import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { ActivityIndicator, Pressable, StyleSheet } from 'react-native';

import { AppText } from '@/components/ui';
import { driverColors, fonts, radius, spacing } from '@/theme';

type Props = { mode: 'start' | 'finish' | 'cancel'; busy: boolean; onPress: () => void };

/** Botón enorme para iniciar o finalizar el viaje (mínimo 64 px de alto). */
export function TripButton({ mode, busy, onPress }: Props) {
  const label = mode === 'start' ? 'Iniciar viaje' : mode === 'finish' ? 'Finalizar viaje' : 'Cerrar sin salir';
  const start = mode === 'start';
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ busy, disabled: busy }}
      disabled={busy}
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        start ? styles.start : styles.finish,
        pressed && styles.pressed,
      ]}
    >
      {busy ? (
        <ActivityIndicator color={driverColors.text} size="large" />
      ) : (
        <>
          <MaterialCommunityIcons name={start ? 'play' : 'flag-checkered'} size={30} color={driverColors.text} />
          <AppText style={styles.label} color={driverColors.text}>
            {label}
          </AppText>
        </>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: { minHeight: 76, borderRadius: radius.lg, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.sm },
  start: { backgroundColor: driverColors.accent },
  finish: { backgroundColor: driverColors.surfaceStrong, borderWidth: 2, borderColor: driverColors.accent },
  pressed: { opacity: 0.85 },
  label: { fontFamily: fonts.display, fontSize: 26, lineHeight: 30 },
});
