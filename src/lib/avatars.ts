import { avatarPalette } from '../theme/tokens';

/** 12 personajes predefinidos: un icono de Ionicons sobre un color de fondo. */
export const AVATARS = [
  { id: 'avatar-01', icon: 'happy', color: avatarPalette[0] },
  { id: 'avatar-02', icon: 'rocket', color: avatarPalette[1] },
  { id: 'avatar-03', icon: 'planet', color: avatarPalette[2] },
  { id: 'avatar-04', icon: 'flash', color: avatarPalette[3] },
  { id: 'avatar-05', icon: 'leaf', color: avatarPalette[4] },
  { id: 'avatar-06', icon: 'paw', color: avatarPalette[5] },
  { id: 'avatar-07', icon: 'musical-notes', color: avatarPalette[6] },
  { id: 'avatar-08', icon: 'football', color: avatarPalette[7] },
  { id: 'avatar-09', icon: 'pizza', color: avatarPalette[8] },
  { id: 'avatar-10', icon: 'headset', color: avatarPalette[9] },
  { id: 'avatar-11', icon: 'bicycle', color: avatarPalette[10] },
  { id: 'avatar-12', icon: 'sparkles', color: avatarPalette[11] },
] as const;

export type PresetAvatar = (typeof AVATARS)[number];
export type AvatarKind = 'preset' | 'foto';

export const DEFAULT_AVATAR_ID = 'avatar-01';

export function getPresetAvatar(id: string): PresetAvatar {
  return AVATARS.find((avatar) => avatar.id === id) ?? AVATARS[0];
}

/** Personaje aleatorio para que cada pasajero empiece con uno distinto. */
export function randomAvatarId(random: () => number = Math.random): string {
  const index = Math.min(AVATARS.length - 1, Math.floor(random() * AVATARS.length));
  return AVATARS[index]?.id ?? DEFAULT_AVATAR_ID;
}
