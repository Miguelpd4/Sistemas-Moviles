import { memo } from 'react';
import { StyleSheet, View } from 'react-native';

import { AppText, Avatar } from '@/components/ui';
import { seatLabel } from '@/lib/seats';
import { colors, driverColors, radius, spacing } from '@/theme';
import type { SessionMember } from '@/types/session';

type Props = {
  members: readonly SessionMember[];
  /** Modo conductor (oscuro) o sala (claro). */
  dark?: boolean;
};

const Row = memo(function Row({ member, dark }: { member: SessionMember; dark: boolean }) {
  const text = dark ? driverColors.text : colors.text;
  const secondary = dark ? driverColors.textSecondary : colors.textSecondary;
  const seat = member.seat !== null ? seatLabel(member.seat) : 'Sin asiento';
  const role = member.role === 'conductor' ? 'Conductor' : member.role === 'copiloto' ? 'Copiloto' : seat;
  return (
    <View
      style={[styles.row, { backgroundColor: dark ? driverColors.surface : colors.surface }]}
      accessible
      accessibilityLabel={`${member.display_name}, ${role}`}
    >
      <Avatar kind={member.avatar_kind} value={member.avatar_value} size={44} />
      <View style={styles.text}>
        <AppText variant="bodyStrong" color={text} numberOfLines={1}>
          {member.display_name}
        </AppText>
        <AppText variant="caption" color={secondary}>
          {role}
        </AppText>
      </View>
    </View>
  );
});

/** Lista de quién está en el coche, con avatar, nombre y asiento. */
export function PassengerList({ members, dark = false }: Props) {
  if (members.length === 0) {
    return (
      <AppText color={dark ? driverColors.textSecondary : colors.textSecondary}>
        Todavía no ha entrado nadie.
      </AppText>
    );
  }
  return (
    <View style={styles.list}>
      {members.map((member) => (
        <Row key={member.user_id} member={member} dark={dark} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  list: { gap: spacing.sm, alignSelf: 'stretch' },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, padding: spacing.sm, borderRadius: radius.md },
  text: { flex: 1 },
});
