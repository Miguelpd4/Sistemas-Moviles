import { Image } from 'expo-image';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { Button, Chip, Notice, Sheet, TextField } from '@/components/ui';
import { errorMessage } from '@/lib/errors';
import { EXTRA_KINDS, parseEurosToCents, type ExtraKind } from '@/lib/expenseForm';
import { pickImage } from '@/services/media/pickImage';
import { addExpense } from '@/services/supabase/payments';
import { radius, spacing } from '@/theme';

type Props = {
  visible: boolean;
  sessionId: string;
  userId: string;
  onClose: () => void;
  onSaved: () => void;
};

/** Añadir un peaje, parking u otro gasto que has pagado tú, con la foto del ticket (#26). */
export function AddExpenseSheet({ visible, sessionId, userId, onClose, onSaved }: Props) {
  const [kind, setKind] = useState<ExtraKind>('peaje');
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [photo, setPhoto] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const cents = parseEurosToCents(amount);

  const reset = () => {
    setKind('peaje');
    setAmount('');
    setDescription('');
    setPhoto(null);
    setError(null);
  };

  const choose = (camera: boolean) => {
    setError(null);
    pickImage({ camera, square: false })
      .then((uri) => {
        if (uri) setPhoto(uri);
      })
      .catch((err: unknown) => setError(errorMessage(err, 'No se ha podido coger la foto.')));
  };

  const save = () => {
    if (cents === null) {
      setError('Escribe el importe en euros, por ejemplo 3,50.');
      return;
    }
    setSaving(true);
    setError(null);
    addExpense({ sessionId, userId, kind, description, amountCents: cents, receiptUri: photo })
      .then(() => {
        reset();
        onSaved();
      })
      .catch((err: unknown) => setError(errorMessage(err)))
      .finally(() => setSaving(false));
  };

  return (
    <Sheet
      visible={visible}
      title="Añadir un gasto"
      description="Lo que has pagado tú (peaje, parking…). Al finalizar se reparte entre todos con la gasolina."
      onClose={onClose}
    >
      <View style={styles.kinds}>
        {EXTRA_KINDS.map((item) => (
          <Chip key={item.kind} label={item.label} selected={kind === item.kind} onPress={() => setKind(item.kind)} />
        ))}
      </View>
      <TextField
        label="Importe (€)"
        value={amount}
        onChangeText={setAmount}
        keyboardType="decimal-pad"
        placeholder="3,50"
        error={amount !== '' && cents === null ? 'Importe no válido (hasta 1.000 €)' : undefined}
      />
      <TextField label="Detalle (opcional)" value={description} onChangeText={setDescription} placeholder="AP-4, parking del centro…" maxLength={60} />
      {photo ? <Image source={{ uri: photo }} style={styles.photo} contentFit="cover" accessibilityLabel="Foto del ticket" /> : null}
      <View style={styles.row}>
        <Button label={photo ? 'Otra foto' : 'Foto del ticket'} icon="camera-outline" variant="secondary" onPress={() => choose(true)} />
        <Button label="Galería" icon="images-outline" variant="secondary" onPress={() => choose(false)} />
      </View>
      {error ? <Notice message={error} /> : null}
      <Button label="Guardar gasto" icon="checkmark" loading={saving} disabled={cents === null} onPress={save} />
    </Sheet>
  );
}

const styles = StyleSheet.create({
  kinds: { flexDirection: 'row', gap: spacing.sm },
  row: { flexDirection: 'row', gap: spacing.sm },
  photo: { width: '100%', height: 160, borderRadius: radius.md },
});
