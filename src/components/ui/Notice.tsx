import Ionicons from '@expo/vector-icons/Ionicons';
import { memo } from 'react';
import { StyleSheet, View } from 'react-native';

import { radius, spacing, useTheme, type Palette } from '@/theme';

import { AppText } from './AppText';

type Tone = 'error' | 'info' | 'success';

type Props = {
  message: string;
  tone?: Tone;
};

function toneColors(tone: Tone, c: Palette) {
  switch (tone) {
    case 'error':
      return { background: c.dangerSoft, color: c.danger, icon: 'alert-circle' as const };
    case 'info':
      return { background: c.primarySoft, color: c.primaryText, icon: 'information-circle' as const };
    case 'success':
      return { background: c.successSoft, color: c.success, icon: 'checkmark-circle' as const };
  }
}

/** Aviso en línea. Los lectores de pantalla lo anuncian al aparecer. */
function NoticeBase({ message, tone = 'error' }: Props) {
  const { colors } = useTheme();
  const palette = toneColors(tone, colors);
  return (
    <View
      style={[styles.box, { backgroundColor: palette.background }]}
      accessibilityRole={tone === 'error' ? 'alert' : 'text'}
      accessibilityLiveRegion="polite"
    >
      <Ionicons name={palette.icon} size={20} color={palette.color} />
      <AppText variant="label" color={palette.color} style={styles.text}>
        {message}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  box: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm, borderRadius: radius.sm, padding: spacing.md },
  text: { flex: 1 },
});

export const Notice = memo(NoticeBase);
