import * as Clipboard from 'expo-clipboard';
import { useState } from 'react';
import { Linking, StyleSheet, View } from 'react-native';

import { AppText, Button } from '@/components/ui';
import { bizumText, paypalMeUrl } from '@/lib/payLinks';
import type { Payee } from '@/services/supabase/payments';
import { spacing, useTheme } from '@/theme';

type Props = {
  paymentId: string;
  amountCents: number;
  /** Yo pago (true) o yo cobro (false). */
  iPay: boolean;
  /** Teléfono y PayPal de quien cobra. */
  payee: Payee | undefined;
  onMarkPaid: (paymentId: string) => Promise<void>;
};

/**
 * Pagar fuera de la app (#27): PayPal.me con el importe, Bizum (copia el teléfono y el importe) y
 * marcar como pagado. Quien cobra puede confirmar que ya le han pagado.
 */
export function PaymentActions({ paymentId, amountCents, iPay, payee, onMarkPaid }: Props) {
  const { colors } = useTheme();
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<string | null>(null);
  const paypal = iPay ? paypalMeUrl(payee?.paypal, amountCents) : null;
  const bizum = iPay ? bizumText(payee?.phone, amountCents) : null;

  const mark = () => {
    setBusy(true);
    void onMarkPaid(paymentId).finally(() => setBusy(false));
  };

  return (
    <View style={styles.box}>
      {paypal ? (
        <Button
          label="Pagar con PayPal"
          icon="logo-paypal"
          variant="secondary"
          onPress={() => void Linking.openURL(paypal).catch(() => setNote('No se ha podido abrir PayPal.'))}
        />
      ) : null}
      {bizum ? (
        <Button
          label="Bizum: copiar teléfono e importe"
          icon="copy-outline"
          variant="secondary"
          onPress={() =>
            void Clipboard.setStringAsync(bizum)
              .then(() => setNote(`Copiado: ${bizum}. Haz el Bizum desde la app de tu banco.`))
              .catch(() => setNote(`Bizum: ${bizum}`))
          }
        />
      ) : null}
      {iPay && !paypal && !bizum ? (
        <AppText variant="caption" color={colors.textSecondary}>
          Quien cobra no ha puesto su teléfono ni su PayPal en Perfil: pagadle en mano o pedídselo.
        </AppText>
      ) : null}
      <Button
        label={iPay ? 'Ya he pagado' : 'Ya me ha pagado'}
        icon="checkmark-circle-outline"
        variant={iPay ? 'primary' : 'secondary'}
        loading={busy}
        onPress={mark}
      />
      {note ? (
        <AppText variant="caption" color={colors.textSecondary}>
          {note}
        </AppText>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  box: { gap: spacing.sm, paddingLeft: spacing.xl + spacing.sm, paddingBottom: spacing.sm },
});
