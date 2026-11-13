import Ionicons from '@expo/vector-icons/Ionicons';
import { Image } from 'expo-image';
import { memo } from 'react';
import { StyleSheet, View } from 'react-native';

import { getPresetAvatar, type AvatarKind } from '@/lib/avatars';
import { colors } from '@/theme';

type Props = {
  kind: AvatarKind | string;
  value: string;
  size?: number;
  /** Texto para lectores de pantalla, por ejemplo el nombre de la persona. */
  label?: string;
};

/** Personaje predefinido (icono sobre color) o foto subida a Storage. */
function AvatarBase({ kind, value, size = 48, label }: Props) {
  const shape = { width: size, height: size, borderRadius: size / 2 };

  if (kind === 'foto' && value.startsWith('http')) {
    return (
      <Image
        source={{ uri: value }}
        style={[styles.photo, shape]}
        contentFit="cover"
        accessibilityLabel={label}
        accessible={label !== undefined}
      />
    );
  }

  const avatar = getPresetAvatar(value);
  return (
    <View
      style={[styles.preset, shape, { backgroundColor: avatar.color }]}
      accessible={label !== undefined}
      accessibilityLabel={label}
      accessibilityRole={label !== undefined ? 'image' : undefined}
    >
      <Ionicons name={avatar.icon} size={size * 0.55} color={colors.textOnPrimary} />
    </View>
  );
}

const styles = StyleSheet.create({
  photo: { backgroundColor: colors.surfaceStrong },
  preset: { alignItems: 'center', justifyContent: 'center' },
});

export const Avatar = memo(AvatarBase);
