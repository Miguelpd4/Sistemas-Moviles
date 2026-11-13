import * as Clipboard from 'expo-clipboard';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { AppText, Button, Card } from '@/components/ui';
import { env } from '@/config/env';
import { carStickerUrl } from '@/lib/carCode';
import { colors, radius, spacing } from '@/theme';

/** Código de la pegatina, su URL y cómo grabarla (S1-07). */
export function StickerCard({ code }: { code: string }) {
  const url = carStickerUrl(env.webUrl, code);
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    await Clipboard.setStringAsync(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Card>
      <AppText variant="heading" accessibilityRole="header">
        Tu pegatina
      </AppText>
      <View style={styles.codeBox}>
        <AppText variant="caption" color={colors.textSecondary}>
          Código del coche
        </AppText>
        <AppText variant="display" selectable accessibilityLabel={`Código ${code.split('').join(' ')}`}>
          {code}
        </AppText>
      </View>
      <AppText selectable color={colors.textSecondary}>
        {url}
      </AppText>
      <Button label={copied ? 'URL copiada' : 'Copiar URL'} variant="secondary" onPress={copy} />
      <View style={styles.steps}>
        <AppText variant="bodyStrong">Cómo grabarla</AppText>
        <AppText>1. Instala la app gratuita NFC Tools.</AppText>
        <AppText>2. Escribir → Añadir un registro → URL / URI.</AppText>
        <AppText>3. Pega la URL de arriba y pulsa Escribir.</AppText>
        <AppText>4. Acerca el móvil a la pegatina NTAG213 o NTAG215.</AppText>
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  codeBox: { backgroundColor: colors.background, borderRadius: radius.md, padding: spacing.md, alignItems: 'center' },
  steps: { gap: spacing.xs },
});
