import Ionicons from '@expo/vector-icons/Ionicons';
import { memo, useEffect } from 'react';
import { StyleSheet, View } from 'react-native';

import { radius, spacing, useTheme } from '@/theme';

import { AppText } from './AppText';
import type { IconName } from './TabIcon';

type Props = {
  message: string | null;
  icon?: IconName;
  onHide: () => void;
  durationMs?: number;
};

/** Aviso breve arriba de la pantalla que desaparece solo. */
function ToastBase({ message, icon = 'notifications', onHide, durationMs = 3500 }: Props) {
  const { colors, elevation } = useTheme();
  useEffect(() => {
    if (message === null) return;
    const timer = setTimeout(onHide, durationMs);
    return () => clearTimeout(timer);
  }, [message, onHide, durationMs]);

  if (message === null) return null;
  return (
    <View pointerEvents="none" style={styles.wrapper}>
      <View
        style={[styles.toast, { backgroundColor: colors.inverse }, elevation]}
        accessibilityLiveRegion="polite"
        accessibilityRole="alert"
      >
        <Ionicons name={icon} size={20} color={colors.primary} />
        <AppText variant="label" color={colors.textOnInverse} style={styles.text}>
          {message}
        </AppText>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { position: 'absolute', top: spacing.xxl + spacing.sm, left: spacing.md, right: spacing.md, alignItems: 'center', zIndex: 20 },
  toast: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.md + 2,
    paddingVertical: spacing.sm + 4,
    maxWidth: 420,
  },
  text: { flexShrink: 1 },
});

export const Toast = memo(ToastBase);
