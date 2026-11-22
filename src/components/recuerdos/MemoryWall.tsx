import Ionicons from '@expo/vector-icons/Ionicons';
import { Image } from 'expo-image';
import { useCallback, useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { AppText, Button, Notice, TextField } from '@/components/ui';
import { useMemories } from '@/hooks/useMemories';
import { useNow } from '@/hooks/useNow';
import { errorMessage } from '@/lib/errors';
import { tripDateLabel } from '@/lib/history';
import { expiryLabel, memoriesOpen } from '@/lib/memories';
import { pickImage } from '@/services/media/pickImage';
import type { Memory } from '@/services/supabase/memories';
import { radius, spacing, useStyles, useTheme, type Palette } from '@/theme';

import { MemoryGrid } from './MemoryGrid';
import { MemoryViewer } from './MemoryViewer';

type Props = {
  sessionId: string;
  /** Cuándo terminó el viaje (null si sigue): las fotos se borran 7 días después. */
  endedAt: string | null;
  myId: string | null;
  /** Nombres de los del coche, para decir quién subió cada foto. */
  names: ReadonlyMap<string, string>;
};

/**
 * Muro de fotos del viaje (#34): cualquiera del coche sube fotos con la cámara o de la galería
 * durante el viaje y hasta 7 días después; solo las ven los que iban y luego se borran solas.
 */
export function MemoryWall({ sessionId, endedAt, myId, names }: Props) {
  const { colors } = useTheme();
  const styles = useStyles(makeStyles);
  const now = useNow(60_000);
  const { memories, error, busy, add, remove } = useMemories(sessionId, myId);
  const [draft, setDraft] = useState<string | null>(null);
  const [caption, setCaption] = useState('');
  const [pickError, setPickError] = useState<string | null>(null);
  const [open, setOpen] = useState<Memory | null>(null);
  const canAdd = myId !== null && memoriesOpen(endedAt, now);

  const choose = (camera: boolean) => {
    setPickError(null);
    pickImage({ camera, edit: false })
      .then((uri) => {
        if (uri) setDraft(uri);
      })
      .catch((err: unknown) => setPickError(errorMessage(err, 'No se ha podido coger la foto.')));
  };

  const upload = () => {
    if (draft === null) return;
    void add(draft, caption).then((ok) => {
      if (!ok) return;
      setDraft(null);
      setCaption('');
    });
  };

  const describe = useCallback(
    (memory: Memory) => `Foto de ${names.get(memory.userId) ?? 'alguien del coche'}${memory.caption ? `: ${memory.caption}` : ''}`,
    [names],
  );

  const deleteOpen = (memory: Memory) => {
    void remove(memory).then(() => setOpen(null));
  };

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <Ionicons name="images-outline" size={22} color={colors.primary} />
        <View style={styles.flex}>
          <AppText variant="heading" accessibilityRole="header">
            Fotos del viaje
          </AppText>
          <AppText variant="caption" color={colors.textSecondary}>
            Solo las veis los del coche · {expiryLabel(endedAt, now)}
          </AppText>
        </View>
      </View>

      {error ? <Notice message={error} /> : null}
      {pickError ? <Notice message={pickError} /> : null}

      {draft ? (
        <View style={styles.draft}>
          <Image source={{ uri: draft }} style={styles.preview} contentFit="cover" accessibilityLabel="Foto elegida" />
          <TextField
            label="Pie de foto (opcional)"
            value={caption}
            onChangeText={setCaption}
            maxLength={140}
            placeholder="¡Qué atardecer!"
            returnKeyType="done"
          />
          <View style={styles.row}>
            <View style={styles.flex}>
              <Button label="Cancelar" variant="secondary" disabled={busy} onPress={() => setDraft(null)} />
            </View>
            <View style={styles.flex}>
              <Button label="Subir al muro" icon="cloud-upload-outline" loading={busy} onPress={upload} />
            </View>
          </View>
        </View>
      ) : canAdd ? (
        <View style={styles.row}>
          <View style={styles.flex}>
            <Button label="Hacer foto" icon="camera-outline" onPress={() => choose(true)} />
          </View>
          <View style={styles.flex}>
            <Button label="De la galería" icon="image-outline" variant="secondary" onPress={() => choose(false)} />
          </View>
        </View>
      ) : null}

      {memories === null ? (
        error ? null : <ActivityIndicator color={colors.primary} />
      ) : memories.length === 0 ? (
        <AppText color={colors.textSecondary} style={styles.center}>
          {canAdd ? 'Aún no hay fotos. ¡Haced la primera!' : 'Este viaje no tiene fotos.'}
        </AppText>
      ) : (
        <MemoryGrid memories={memories} onOpen={setOpen} describe={describe} />
      )}

      <MemoryViewer
        memory={open}
        subtitle={open ? `${names.get(open.userId) ?? 'Alguien del coche'} · ${tripDateLabel(open.createdAt)}` : ''}
        canDelete={open !== null && open.userId === myId}
        deleting={busy}
        onDelete={deleteOpen}
        onClose={() => setOpen(null)}
      />
    </View>
  );
}

const makeStyles = (c: Palette) =>
  StyleSheet.create({
    card: {
      gap: spacing.sm + 4,
      padding: spacing.md,
      borderRadius: radius.lg,
      backgroundColor: c.surfaceRaised,
      borderWidth: 1,
      borderColor: c.border,
    },
    header: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm + 2 },
    flex: { flex: 1 },
    row: { flexDirection: 'row', gap: spacing.sm },
    draft: { gap: spacing.sm },
    preview: { width: '100%', aspectRatio: 4 / 3, borderRadius: radius.md },
    center: { textAlign: 'center' },
  });
