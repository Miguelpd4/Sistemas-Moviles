import { useCallback, useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { MemoryGrid } from '@/components/recuerdos/MemoryGrid';
import { MemoryViewer } from '@/components/recuerdos/MemoryViewer';
import { AppText, Notice } from '@/components/ui';
import { useMemories } from '@/hooks/useMemories';
import { useNow } from '@/hooks/useNow';
import { expiryLabel } from '@/lib/memories';
import type { Memory } from '@/services/supabase/memories';
import { radius, spacing, useStyles, useTheme, type Palette } from '@/theme';

/** «Tus recuerdos» en el Perfil (#34): las fotos de tus viajes que aún no se han borrado. */
export function MyMemories({ myId }: { myId: string }) {
  const { colors } = useTheme();
  const styles = useStyles(makeStyles);
  const now = useNow(60_000);
  const { memories, error, busy, remove } = useMemories('todas', myId);
  const [open, setOpen] = useState<Memory | null>(null);

  const describe = useCallback(
    (memory: Memory) => `Foto del viaje en el ${memory.carName ?? 'coche'}. ${expiryLabel(memory.endedAt, now)}`,
    [now],
  );

  return (
    <View style={styles.section}>
      <AppText variant="heading" accessibilityRole="header">
        Tus recuerdos
      </AppText>
      <AppText variant="caption" color={colors.textSecondary}>
        Las fotos de tus viajes. Cada viaje guarda las suyas 7 días después de terminar y luego se borran solas.
      </AppText>
      {error ? <Notice message={error} /> : null}
      {memories === null ? (
        error ? null : <ActivityIndicator color={colors.primary} />
      ) : memories.length === 0 ? (
        <AppText color={colors.textSecondary}>
          Aún no hay fotos. En el próximo viaje, súbelas desde la pestaña Viaje o desde el Resumen.
        </AppText>
      ) : (
        <MemoryGrid memories={memories} onOpen={setOpen} describe={describe} />
      )}
      <MemoryViewer
        memory={open}
        subtitle={open ? `${open.carName ?? 'Viaje'} · ${expiryLabel(open.endedAt, now)}` : ''}
        canDelete={open !== null && open.userId === myId}
        deleting={busy}
        onDelete={(memory) => void remove(memory).then(() => setOpen(null))}
        onClose={() => setOpen(null)}
      />
    </View>
  );
}

const makeStyles = (c: Palette) =>
  StyleSheet.create({
    section: { gap: spacing.sm + 4, padding: spacing.md + 4, borderRadius: radius.lg, backgroundColor: c.surface },
  });
