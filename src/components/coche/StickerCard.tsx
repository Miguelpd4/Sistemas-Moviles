import * as Clipboard from 'expo-clipboard';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import QRCode from 'react-native-qrcode-svg';

import { AppText, Button, Card, IconTile } from '@/components/ui';
import { env } from '@/config/env';
import { carStickerUrl } from '@/lib/carCode';
import { darkColors, radius, spacing, useTheme } from '@/theme';

import { LicensePlate } from './LicensePlate';

const STEPS = [
  'Instala la app gratuita NFC Tools.',
  'Escribir → Añadir un registro → URL / URI.',
  'Pega la dirección de arriba y pulsa Escribir.',
  'Acerca el móvil a la pegatina NTAG213 o NTAG215.',
] as const;

/** Código de la pegatina, su URL y cómo grabarla (S1-07). */
export function StickerCard({ code }: { code: string }) {
  const { colors } = useTheme();
  const url = carStickerUrl(env.webUrl, code);
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    await Clipboard.setStringAsync(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Card tone="raised">
      <View style={styles.titleRow}>
        <IconTile icon="nfc-variant" tint="teal" size={44} />
        <View style={styles.head}>
          <AppText variant="heading" accessibilityRole="header">
            Tu pegatina y tu QR
          </AppText>
          <AppText variant="label" color={colors.textSecondary}>
            Graba esta dirección en la pegatina NFC. Quien no tenga NFC puede escanear el QR.
          </AppText>
        </View>
      </View>
      <View style={styles.codes}>
        <View
          style={styles.qr}
          accessible
          accessibilityRole="image"
          accessibilityLabel={`Código QR del coche ${code} para entrar en el viaje`}
        >
          <QRCode value={url} size={168} color={darkColors.qrDark} backgroundColor={darkColors.qrLight} ecl="M" />
        </View>
        <LicensePlate code={code} size="lg" />
      </View>
      <View style={[styles.url, { backgroundColor: colors.background }]}>
        <AppText selectable variant="bodyStrong" numberOfLines={2}>
          {url}
        </AppText>
      </View>
      <Button
        label={copied ? 'Dirección copiada' : 'Copiar dirección'}
        icon={copied ? 'checkmark' : 'copy-outline'}
        variant="secondary"
        onPress={copy}
      />
      <View style={styles.steps}>
        <AppText variant="bodyStrong">Cómo grabarla</AppText>
        {STEPS.map((step, index) => (
          <View key={step} style={styles.step}>
            <View style={[styles.number, { backgroundColor: colors.primarySoft }]}>
              <AppText variant="caption" color={colors.primaryText}>
                {index + 1}
              </AppText>
            </View>
            <AppText variant="label" color={colors.textSecondary} style={styles.stepText}>
              {step}
            </AppText>
          </View>
        ))}
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  titleRow: { flexDirection: 'row', gap: spacing.md, alignItems: 'flex-start' },
  head: { flex: 1, gap: 2 },
  codes: { alignItems: 'center', gap: spacing.md, paddingVertical: spacing.sm },
  // El QR siempre en negro sobre blanco con margen: lo lee cualquier cámara en los dos temas.
  qr: { backgroundColor: darkColors.qrLight, padding: spacing.md, borderRadius: radius.md },
  url: { borderRadius: radius.sm, padding: spacing.md },
  steps: { gap: spacing.sm, marginTop: spacing.xs },
  step: { flexDirection: 'row', gap: spacing.sm, alignItems: 'flex-start' },
  number: { width: 24, height: 24, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  stepText: { flex: 1 },
});
