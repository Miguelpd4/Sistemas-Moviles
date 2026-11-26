import Ionicons from '@expo/vector-icons/Ionicons';
import { memo } from 'react';
import { StyleSheet, View } from 'react-native';

import { AppText, IconTile, PressableScale, type MciName, type Tint } from '@/components/ui';
import { radius, spacing, useStyles, useTheme, type Palette } from '@/theme';

type Props = { icon: MciName; tint: Tint; title: string; subtitle: string; onPress: () => void };

/** Acceso rápido de Inicio: icono de color, título y una línea; media columna de ancho. */
function QuickActionBase({ icon, tint, title, subtitle, onPress }: Props) {
  const { colors } = useTheme();
  const styles = useStyles(makeStyles);
  return (
    <PressableScale
      accessibilityRole="button"
      accessibilityLabel={`${title}. ${subtitle}`}
      onPress={onPress}
      style={styles.tile}
      pressedStyle={{ backgroundColor: colors.surfaceStrong }}
    >
      <View style={styles.top}>
        <IconTile icon={icon} tint={tint} size={42} />
        <Ionicons name="arrow-forward" size={18} color={colors.textTertiary} />
      </View>
      <View>
        <AppText variant="heading" numberOfLines={1}>
          {title}
        </AppText>
        <AppText variant="caption" color={colors.textSecondary} numberOfLines={1}>
          {subtitle}
        </AppText>
      </View>
    </PressableScale>
  );
}

export const QuickAction = memo(QuickActionBase);

const makeStyles = (c: Palette) =>
  StyleSheet.create({
    tile: {
      flexBasis: '46%',
      flexGrow: 1,
      minHeight: 118,
      justifyContent: 'space-between',
      gap: spacing.md,
      padding: spacing.md,
      borderRadius: radius.lg,
      backgroundColor: c.surface,
      borderWidth: 1,
      borderColor: c.border,
    },
    top: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' },
  });
