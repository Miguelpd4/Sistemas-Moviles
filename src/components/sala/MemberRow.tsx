import Ionicons from '@expo/vector-icons/Ionicons';
import { memo } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { AppText, Avatar, Badge } from '@/components/ui';
import { seatLabel } from '@/lib/seats';
import { radius, spacing, useTheme } from '@/theme';
import type { SessionMember } from '@/types/session';

type Props = {
  member: SessionMember;
  online: boolean;
  isMe: boolean;
  /** Muestra el botón de opciones (solo el conductor, con el coche parado). */
  onMenu?: (member: SessionMember) => void;
};

/** Una persona de la sala: avatar con punto de conexión, nombre, asiento y su papel. */
function MemberRowBase({ member, online, isMe, onMenu }: Props) {
  const { colors } = useTheme();
  const role = member.role === 'conductor' ? 'Conductor' : member.role === 'copiloto' ? 'Copiloto' : null;
  const seat = member.seat !== null ? seatLabel(member.seat) : 'Sin asiento';

  return (
    <View
      style={[styles.row, { backgroundColor: colors.surface }]}
      accessible={onMenu === undefined}
      accessibilityLabel={`${member.display_name}${isMe ? ' (tú)' : ''}, ${role ?? seat}, ${online ? 'conectado' : 'desconectado'}`}
    >
      <View>
        <Avatar kind={member.avatar_kind} value={member.avatar_value} size={48} />
        <View
          style={[
            styles.dot,
            { backgroundColor: online ? colors.success : colors.textTertiary, borderColor: colors.surface },
          ]}
        />
      </View>
      <View style={styles.text}>
        <AppText variant="bodyStrong" numberOfLines={1}>
          {member.display_name}
          {isMe ? <AppText variant="bodyStrong" color={colors.textTertiary}> · tú</AppText> : null}
        </AppText>
        <AppText variant="caption" color={colors.textSecondary}>
          {seat}
          {online ? '' : ' · desconectado'}
        </AppText>
      </View>
      {role ? <Badge label={role} tone={member.role === 'copiloto' ? 'primary' : 'neutral'} /> : null}
      {onMenu ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Opciones de ${member.display_name}`}
          onPress={() => onMenu(member)}
          hitSlop={8}
          style={({ pressed }) => [styles.menu, { backgroundColor: pressed ? colors.surfaceStrong : 'transparent' }]}
        >
          <Ionicons name="ellipsis-horizontal" size={22} color={colors.textSecondary} />
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, padding: spacing.sm + 2, borderRadius: radius.md },
  dot: { position: 'absolute', right: -1, bottom: -1, width: 15, height: 15, borderRadius: 8, borderWidth: 3 },
  text: { flex: 1, gap: 1 },
  menu: { width: 40, height: 40, borderRadius: radius.pill, alignItems: 'center', justifyContent: 'center' },
});

export const MemberRow = memo(MemberRowBase);
