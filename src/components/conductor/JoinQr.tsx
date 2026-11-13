import { StyleSheet, View } from 'react-native';
import QRCode from 'react-native-qrcode-svg';

import { AppText } from '@/components/ui';
import { env } from '@/config/env';
import { carStickerUrl } from '@/lib/carCode';
import { colors, driverColors, radius, spacing } from '@/theme';

/** QR con la misma URL que la pegatina, para quien no tenga NFC (S1-08). */
export function JoinQr({ nfcCode, size = 220 }: { nfcCode: string; size?: number }) {
  const url = carStickerUrl(env.webUrl, nfcCode);
  return (
    <View style={styles.wrapper}>
      <View
        style={styles.qr}
        accessible
        accessibilityRole="image"
        accessibilityLabel="Código QR para entrar en el viaje"
      >
        <QRCode value={url} size={size} color={colors.qrDark} backgroundColor={colors.qrLight} ecl="M" />
      </View>
      <AppText variant="heading" color={driverColors.text}>
        Toca la pegatina o escanea
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { alignItems: 'center', gap: spacing.md },
  // Fondo blanco y margen: los lectores de QR necesitan contraste y zona en blanco alrededor.
  qr: { backgroundColor: colors.qrLight, padding: spacing.md, borderRadius: radius.md },
});
