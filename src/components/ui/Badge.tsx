import { StyleSheet, View } from 'react-native';

import { radius, spacing, useTheme, type Palette } from '@/theme';

import { AppText } from './AppText';

type Tone = 'neutral' | 'primary' | 'success' | 'danger' | 'live';

function toneColors(tone: Tone, c: Palette) {
  switch (tone) {
    case 'neutral':
      return { background: c.surfaceStrong, text: c.textSecondary };
    case 'primary':
      return { background: c.primarySoft, text: c.primaryText };
    case 'success':
      return { background: c.successSoft, text: c.success };
    case 'danger':
      return { background: c.dangerSoft, text: c.danger };
    case 'live':
      return { background: c.successSoft, text: c.success };
  }
}

/** Etiqueta corta de estado: «Conductor», «En marcha», «Libre»… */
export function Badge({ label, tone = 'neutral' }: { label: string; tone?: Tone }) {
  const { colors } = useTheme();
  const palette = toneColors(tone, colors);
  return (
    <View style={[styles.badge, { backgroundColor: palette.background }]}>
      {tone === 'live' ? <View style={[styles.dot, { backgroundColor: colors.success }]} /> : null}
      <AppText variant="caption" color={palette.text}>
        {label}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    alignSelf: 'flex-start',
    paddingHorizontal: spacing.sm + 2,
    paddingVertical: 4,
    borderRadius: radius.pill,
  },
  dot: { width: 7, height: 7, borderRadius: 4 },
});
