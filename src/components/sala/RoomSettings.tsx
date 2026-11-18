import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { AppText, Notice, Switch } from '@/components/ui';
import { errorMessage } from '@/lib/errors';
import { setJoinMode } from '@/services/supabase/sessions';
import { radius, spacing, useTheme } from '@/theme';
import type { JoinMode } from '@/types/session';

type Props = { sessionId: string; joinMode: JoinMode };

/** Ajustes de la sala para el conductor y el copiloto: pedir aprobación para entrar. */
export function RoomSettings({ sessionId, joinMode }: Props) {
  const { colors } = useTheme();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const change = async (value: boolean) => {
    setSaving(true);
    setError(null);
    try {
      await setJoinMode(sessionId, value ? 'aprobacion' : 'libre');
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  return (
    <View style={[styles.box, { backgroundColor: colors.surface }]}>
      <AppText variant="heading" accessibilityRole="header">
        Ajustes de la sala
      </AppText>
      <Switch
        label="Pedir aprobación para entrar"
        description={joinMode === 'aprobacion' ? 'Aceptas a cada persona antes de que entre.' : 'Cualquiera con la pegatina o el QR entra directamente.'}
        value={joinMode === 'aprobacion'}
        onChange={(value) => void change(value)}
        disabled={saving}
      />
      {error ? <Notice message={error} /> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  box: { borderRadius: radius.lg, padding: spacing.md + 4, gap: spacing.xs },
});
