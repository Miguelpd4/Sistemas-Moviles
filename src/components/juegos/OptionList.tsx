import Ionicons from '@expo/vector-icons/Ionicons';
import { memo } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { AppText, Avatar } from '@/components/ui';
import { radius, spacing, useTheme } from '@/theme';

export type GameOption = { id: string; label: string; detail?: string; avatarKind?: string; avatarValue?: string };

type Props = {
  options: readonly GameOption[];
  selected: string | null;
  disabled: boolean;
  onSelect: (id: string) => void;
};

/** Opciones de una ronda en rejilla de dos: avatar y nombre de cada persona, o título y artista de una canción. */
function OptionListBase({ options, selected, disabled, onSelect }: Props) {
  const { colors } = useTheme();
  return (
    <View style={styles.grid} accessibilityRole="radiogroup">
      {options.map((option) => {
        const active = selected === option.id;
        return (
          <Pressable
            key={option.id}
            accessibilityRole="radio"
            accessibilityState={{ checked: active, disabled }}
            accessibilityLabel={option.detail ? `${option.label}, de ${option.detail}` : option.label}
            disabled={disabled}
            onPress={() => onSelect(option.id)}
            style={({ pressed }) => [
              styles.option,
              {
                backgroundColor: active ? colors.primary : pressed ? colors.surfaceStrong : colors.surface,
                borderColor: active ? colors.primaryPressed : colors.border,
              },
            ]}
          >
            {option.avatarValue ? <Avatar kind={option.avatarKind ?? 'preset'} value={option.avatarValue} size={56} /> : null}
            <AppText
              variant="bodyStrong"
              numberOfLines={option.avatarValue ? 1 : 2}
              color={active ? colors.textOnPrimary : colors.text}
              style={styles.label}
            >
              {option.label}
            </AppText>
            {option.detail ? (
              <AppText variant="caption" numberOfLines={1} color={active ? colors.textOnPrimary : colors.textSecondary} style={styles.label}>
                {option.detail}
              </AppText>
            ) : null}
            {active ? (
              <View style={[styles.check, { backgroundColor: colors.textOnPrimary }]}>
                <Ionicons name="checkmark" size={16} color={colors.primary} />
              </View>
            ) : null}
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm + 2 },
  option: {
    flexBasis: '47%',
    flexGrow: 1,
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.sm,
    borderRadius: radius.lg,
    borderWidth: 2,
    minHeight: 120,
    justifyContent: 'center',
  },
  label: { textAlign: 'center' },
  check: { position: 'absolute', top: 10, right: 10, width: 24, height: 24, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
});

export const OptionList = memo(OptionListBase);
