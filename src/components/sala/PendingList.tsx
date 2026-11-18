import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { AppText, Avatar, Badge, Button, Notice } from '@/components/ui';
import { errorMessage } from '@/lib/errors';
import { seatLabel } from '@/lib/seats';
import { reviewJoin } from '@/services/supabase/sessions';
import { driverColors, radius, spacing, useTheme } from '@/theme';
import type { SessionMember } from '@/types/session';

type Props = {
  sessionId: string;
  pending: SessionMember[];
  /** Colores del Modo conductor. */
  dark?: boolean;
};

/** Personas que esperan para entrar, con Aceptar y Rechazar (conductor y copiloto). */
export function PendingList({ sessionId, pending, dark = false }: Props) {
  const { colors } = useTheme();
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  if (pending.length === 0) return null;

  const review = async (userId: string, accept: boolean) => {
    setBusy(userId);
    setError(null);
    try {
      await reviewJoin(sessionId, userId, accept);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(null);
    }
  };

  const surface = dark ? driverColors.surface : colors.surfaceRaised;
  const text = dark ? driverColors.text : colors.text;
  const secondary = dark ? driverColors.textSecondary : colors.textSecondary;

  return (
    <View style={[styles.box, { borderColor: colors.primary, backgroundColor: surface }]}>
      <View style={styles.head}>
        <AppText variant="heading" color={text} accessibilityRole="header">
          Quieren subir
        </AppText>
        <Badge label={String(pending.length)} tone="primary" />
      </View>
      {error ? <Notice message={error} /> : null}
      {pending.map((member) => (
        <View key={member.user_id} style={styles.row}>
          <Avatar kind={member.avatar_kind} value={member.avatar_value} size={52} />
          <View style={styles.text}>
            <AppText variant="heading" color={text} numberOfLines={1}>
              {member.display_name}
            </AppText>
            <AppText variant="caption" color={secondary}>
              {member.seat !== null ? `Quiere ${seatLabel(member.seat).toLowerCase()}` : 'Sin asiento'}
            </AppText>
          </View>
          <View style={styles.actions}>
            <Button
              label="Rechazar"
              variant={dark ? 'driver' : 'secondary'}
              block={false}
              disabled={busy !== null}
              onPress={() => void review(member.user_id, false)}
            />
            <Button
              label="Aceptar"
              icon="checkmark"
              block={false}
              loading={busy === member.user_id}
              disabled={busy !== null && busy !== member.user_id}
              onPress={() => void review(member.user_id, true)}
            />
          </View>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  box: { borderWidth: 2, borderRadius: radius.lg, padding: spacing.md, gap: spacing.md },
  head: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  row: { gap: spacing.sm, flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center' },
  text: { flex: 1, minWidth: 120 },
  actions: { flexDirection: 'row', gap: spacing.sm, marginLeft: 'auto' },
});
