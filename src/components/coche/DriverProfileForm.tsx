import { useState } from 'react';

import { AppText, Button, Card, Notice, TextField } from '@/components/ui';
import { useAuth } from '@/hooks/useAuth';
import { errorMessage } from '@/lib/errors';
import { validateProfileFields, type DriverFormErrors } from '@/lib/profileForm';

/** Nombre, teléfono y PayPal del conductor, editables (S1-07). */
export function DriverProfileForm() {
  const { profile, updateProfile } = useAuth();
  const [displayName, setDisplayName] = useState(profile?.display_name ?? '');
  const [phone, setPhone] = useState(profile?.phone ?? '');
  const [paypalUsername, setPaypal] = useState(profile?.paypal_username ?? '');
  const [errors, setErrors] = useState<DriverFormErrors>({});
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ text: string; tone: 'error' | 'success' } | null>(null);

  const save = async () => {
    const found = validateProfileFields({ displayName, phone, paypalUsername });
    setErrors(found);
    if (Object.keys(found).length > 0) return;
    setSaving(true);
    setMessage(null);
    try {
      await updateProfile({ display_name: displayName, phone, paypal_username: paypalUsername });
      setMessage({ text: 'Datos guardados.', tone: 'success' });
    } catch (error) {
      setMessage({ text: errorMessage(error), tone: 'error' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card>
      <AppText variant="heading" accessibilityRole="header">
        Tus datos de conductor
      </AppText>
      <TextField label="Tu nombre" value={displayName} onChangeText={setDisplayName} error={errors.displayName} maxLength={30} />
      <TextField label="Teléfono para Bizum (opcional)" value={phone} onChangeText={setPhone} error={errors.phone} keyboardType="phone-pad" />
      <TextField label="Usuario de PayPal.me (opcional)" value={paypalUsername} onChangeText={setPaypal} error={errors.paypalUsername} autoCapitalize="none" />
      {message !== null ? <Notice message={message.text} tone={message.tone} /> : null}
      <Button label="Guardar mis datos" variant="secondary" onPress={save} loading={saving} />
    </Card>
  );
}
