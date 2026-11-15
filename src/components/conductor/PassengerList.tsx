import { memo } from 'react';
import { StyleSheet, View } from 'react-native';

import { AppText, Avatar, Badge } from '@/components/ui';
import { seatLabel } from '@/lib/seats';
import { driverColors, radius, spacing, useTheme } from '@/theme';
import type { SessionMember } from '@/types/session';

type Props = {
  members: readonly SessionMember[];
  /** Modo conductor (oscuro) o sala (claro). */
  dark?: boolean;
};

const Row = memo(function Row({ member, dark }: { member: SessionMember; dark: boolean }) {
  const { colors } = useTheme();
  const text = dark ? driverColors.text : colors.text;
  const secondary = dark ? driverColors.textSecondary : colors.textSecondary;
  const seat = member.seat !== null ? seatLabel(member.seat) : 'Sin asiento';
  const roleBadge = member.role === 'conductor' ? 'Conductor' : member.role === 'copiloto' ? 'Copiloto' : null;
  return (
    <View
      style={[styles.row, dark ? styles.rowDark : { backgroundColor: colors.surface }]}
      accessible
      accessibilityLabel={`${member.display_name}, ${roleBadge ?? seat}`}
    >
      <Avatar kind={member.avatar_kind} value={member.avatar_value} size={dark ? 52 : 44} />
      <View style={styles.text}>
        <AppText variant={dark ? 'heading' : 'bodyStrong'} color={text} numberOfLines={1}>
          {member.display_name}
        </AppText>
        <AppText variant="caption" color={secondary}>
          {seat}
        </AppText>
      </View>
      {roleBadge && !dark ? <Badge label={roleBadge} tone={member.role === 'conductor' ? 'neutral' : 'primary'} /> : null}
    </View>
  );
});

/** Lista de quién está en el coche, con avatar, nombre y asiento. */
export function PassengerList({ members, dark = false }: Props) {
  const { colors } = useTheme();
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
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, padding: spacing.sm, paddingRight: spacing.md, borderRadius: radius.md },
  rowDark: { backgroundColor: driverColors.surface },
  text: { flex: 1 },
});
