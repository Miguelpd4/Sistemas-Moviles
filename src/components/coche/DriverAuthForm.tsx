import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { AppText, Button, Card, Notice, TextField } from '@/components/ui';
import { useAuth } from '@/hooks/useAuth';
import { errorMessage } from '@/lib/errors';
import { validateDriverForm, type DriverFormErrors, type DriverFormValues } from '@/lib/profileForm';
import { radius, spacing, useTheme } from '@/theme';

type Mode = 'signup' | 'signin';

const EMPTY: DriverFormValues = { email: '', password: '', displayName: '', phone: '', paypalUsername: '' };

/** Crear cuenta o entrar como conductor (S1-07). */
export function DriverAuthForm() {
  const { colors } = useTheme();
  const { signUpDriver, signIn } = useAuth();
  const [mode, setMode] = useState<Mode>('signup');
  const [values, setValues] = useState<DriverFormValues>(EMPTY);
  const [errors, setErrors] = useState<DriverFormErrors>({});
  const [submitted, setSubmitted] = useState(false);
  const [sending, setSending] = useState(false);
  const [failure, setFailure] = useState<string | null>(null);

  const update = (field: keyof DriverFormValues) => (text: string) => {
    const next = { ...values, [field]: text };
    setValues(next);
    if (submitted) setErrors(validateDriverForm(next, mode));
  };

  const submit = async () => {
    setSubmitted(true);
    const found = validateDriverForm(values, mode);
    setErrors(found);
    if (Object.keys(found).length > 0) return;

    setSending(true);
    setFailure(null);
    try {
      if (mode === 'signup') {
        await signUpDriver({
          email: values.email,
          password: values.password,
          displayName: values.displayName,
          phone: values.phone,
          paypalUsername: values.paypalUsername,
        });
      } else {
        await signIn(values.email, values.password);
      }
    } catch (error) {
      setFailure(errorMessage(error));
    } finally {
      setSending(false);
    }
  };

  const switchMode = (next: Mode) => {
    setMode(next);
    setErrors({});
    setSubmitted(false);
    setFailure(null);
  };

  return (
    <Card tone="raised">
      <View style={[styles.tabs, { backgroundColor: colors.background }]} accessibilityRole="tablist">
        {(['signup', 'signin'] as const).map((option) => (
          <Pressable
            key={option}
            accessibilityRole="tab"
            accessibilityState={{ selected: mode === option }}
            onPress={() => switchMode(option)}
            style={[styles.tab, mode === option && { backgroundColor: colors.surfaceStrong }]}
          >
            <AppText variant="bodyStrong" color={mode === option ? colors.text : colors.textSecondary}>
              {option === 'signup' ? 'Crear cuenta' : 'Entrar'}
            </AppText>
          </Pressable>
        ))}
      </View>

      {mode === 'signup' ? (
        <TextField label="Tu nombre" value={values.displayName} onChangeText={update('displayName')} error={errors.displayName} autoCapitalize="words" maxLength={30} />
      ) : null}
      <TextField label="Email" value={values.email} onChangeText={update('email')} error={errors.email} keyboardType="email-address" autoCapitalize="none" autoComplete="email" />
      <TextField label="Contraseña" value={values.password} onChangeText={update('password')} error={errors.password} secureTextEntry autoComplete={mode === 'signup' ? 'new-password' : 'current-password'} />
      {mode === 'signup' ? (
        <>
          <TextField label="Teléfono para Bizum (opcional)" value={values.phone} onChangeText={update('phone')} error={errors.phone} keyboardType="phone-pad" autoComplete="tel" />
          <TextField label="Usuario de PayPal.me (opcional)" value={values.paypalUsername} onChangeText={update('paypalUsername')} error={errors.paypalUsername} autoCapitalize="none" hint="Lo que va después de paypal.me/" />
        </>
      ) : null}

      {failure !== null ? <Notice message={failure} /> : null}
      <Button label={mode === 'signup' ? 'Crear cuenta' : 'Entrar'} size="lg" onPress={submit} loading={sending} />
      <AppText variant="caption" color={colors.textSecondary}>
        Solo necesitas cuenta si eres conductor. Los pasajeros entran tocando la pegatina.
      </AppText>
    </Card>
  );
}

const styles = StyleSheet.create({
  tabs: { flexDirection: 'row', borderRadius: radius.pill, padding: spacing.xs },
  tab: { flex: 1, alignItems: 'center', paddingVertical: spacing.sm, borderRadius: radius.pill, minHeight: 44, justifyContent: 'center' },
});
