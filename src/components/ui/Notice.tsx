import Ionicons from '@expo/vector-icons/Ionicons';
import { memo } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { radius, spacing, useTheme, type Palette } from '@/theme';

import { AppText } from './AppText';

type Tone = 'error' | 'info' | 'success' | 'warning';

type Props = {
  message: string;
  tone?: Tone;
  /** Acción para salir del aviso, por ejemplo «Reintentar». */
  action?: { label: string; onPress: () => void };
};

function toneColors(tone: Tone, c: Palette) {
  switch (tone) {
    case 'error':
      return { background: c.dangerSoft, color: c.danger, icon: 'alert-circle' as const };
    case 'info':
      return { background: c.infoSoft, color: c.info, icon: 'information-circle' as const };
    case 'success':
      return { background: c.successSoft, color: c.success, icon: 'checkmark-circle' as const };
    case 'warning':
      return { background: c.warningSoft, color: c.warning, icon: 'warning' as const };
  }
}

/** Aviso en línea, con una acción opcional (Reintentar). Los lectores de pantalla lo anuncian al aparecer. */
function NoticeBase({ message, tone = 'error', action }: Props) {
  const { colors } = useTheme();
  const palette = toneColors(tone, colors);
  return (
    <View
      style={[styles.box, { backgroundColor: palette.background, borderColor: palette.color }]}
      accessibilityRole={tone === 'error' ? 'alert' : 'text'}
      accessibilityLiveRegion="polite"
    >
      <Ionicons name={palette.icon} size={20} color={palette.color} />
      <AppText variant="label" color={palette.color} style={styles.text}>
        {message}
      </AppText>
      {action ? (
        <Pressable accessibilityRole="button" onPress={action.onPress} hitSlop={10} style={[styles.action, { borderColor: palette.color }]}>
          <AppText variant="label" color={palette.color}>
            {action.label}
          </AppText>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  box: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm + 2,
    borderRadius: radius.md,
    paddingVertical: spacing.sm + 4,
    paddingHorizontal: spacing.md,
    borderWidth: StyleSheet.hairlineWidth,
  },
  text: { flex: 1 },
  action: { paddingHorizontal: spacing.sm + 4, paddingVertical: spacing.xs + 2, borderRadius: radius.pill, borderWidth: 1 },
});

export const Notice = memo(NoticeBase);
