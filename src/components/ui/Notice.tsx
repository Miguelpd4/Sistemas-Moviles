import Ionicons from '@expo/vector-icons/Ionicons';
import { memo } from 'react';
import { StyleSheet, View } from 'react-native';

import { colors, radius, spacing } from '@/theme';

import { AppText } from './AppText';

type Props = {
  message: string;
  tone?: 'error' | 'info' | 'success';
};

const tones = {
  error: { background: colors.dangerSoft, color: colors.danger, icon: 'alert-circle' },
  info: { background: colors.primarySoft, color: colors.primaryText, icon: 'information-circle' },
  success: { background: colors.successSoft, color: colors.success, icon: 'checkmark-circle' },
} as const;

/** Aviso en línea. Los lectores de pantalla lo anuncian al aparecer. */
function NoticeBase({ message, tone = 'error' }: Props) {
  const palette = tones[tone];
  return (
    <View
      style={[styles.box, { backgroundColor: palette.background }]}
      accessibilityRole={tone === 'error' ? 'alert' : 'text'}
      accessibilityLiveRegion="polite"
    >
      <Ionicons name={palette.icon} size={20} color={palette.color} />
      <AppText variant="bodyStrong" color={palette.color} style={styles.text}>
        {message}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  box: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    borderRadius: radius.sm,
    padding: spacing.md,
  },
  text: { flex: 1 },
});

export const Notice = memo(NoticeBase);
