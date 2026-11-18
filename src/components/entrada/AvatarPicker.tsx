import Ionicons from '@expo/vector-icons/Ionicons';
import { memo } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';

import { AppText, Avatar } from '@/components/ui';
import { AVATARS, type AvatarKind } from '@/lib/avatars';
import { radius, spacing, useTheme } from '@/theme';

type Props = {
  kind: AvatarKind;
  value: string;
  onSelect: (kind: AvatarKind, value: string) => void;
  onPickPhoto: () => void;
  uploading: boolean;
};

/** Rejilla de 12 personajes más «Usar una foto». */
function AvatarPickerBase({ kind, value, onSelect, onPickPhoto, uploading }: Props) {
  const { colors } = useTheme();
  const ring = (selected: boolean) => ({ borderColor: selected ? colors.primary : 'transparent' });
  return (
    <View style={styles.grid}>
      {AVATARS.map((avatar, index) => {
        const selected = kind === 'preset' && value === avatar.id;
        return (
          <Pressable
            key={avatar.id}
            accessibilityRole="button"
            accessibilityLabel={`Personaje ${index + 1}`}
            accessibilityState={{ selected }}
            onPress={() => onSelect('preset', avatar.id)}
            style={[styles.option, ring(selected)]}
          >
            <Avatar kind="preset" value={avatar.id} size={52} />
          </Pressable>
        );
      })}
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Usar una foto"
        accessibilityState={{ selected: kind === 'foto', busy: uploading }}
        onPress={onPickPhoto}
        disabled={uploading}
        style={[styles.option, ring(kind === 'foto')]}
      >
        {uploading ? (
          <ActivityIndicator color={colors.primary} />
        ) : kind === 'foto' ? (
          <Avatar kind="foto" value={value} size={52} />
        ) : (
          <View style={[styles.photoButton, { backgroundColor: colors.surfaceStrong }]}>
            <Ionicons name="camera-outline" size={24} color={colors.text} />
            <AppText variant="caption">Foto</AppText>
          </View>
        )}
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, justifyContent: 'center' },
  option: {
    width: 64,
    height: 64,
    borderRadius: radius.pill,
    borderWidth: 3,
    borderColor: 'transparent',
    alignItems: 'center',
    justifyContent: 'center',
  },
  photoButton: {
    width: 52,
    height: 52,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

export const AvatarPicker = memo(AvatarPickerBase);
