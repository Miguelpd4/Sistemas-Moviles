import { StyleSheet, View } from 'react-native';

import { fonts, useTheme } from '@/theme';

import { AppText } from './AppText';

/** La marca de COPI: la «C» naranja del icono de la app, en pequeño. */
export function BrandMark({ size = 28 }: { size?: number }) {
  const { colors } = useTheme();
  return (
    <View
      style={[styles.mark, { width: size, height: size, borderRadius: Math.round(size * 0.3), backgroundColor: colors.primary }]}
      accessibilityLabel="COPI"
      accessibilityRole="image"
    >
      <AppText style={{ fontFamily: fonts.black, fontSize: size * 0.66, lineHeight: size * 0.8 }} color={colors.textOnPrimary} maxFontSizeMultiplier={1}>
        C
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({ mark: { alignItems: 'center', justifyContent: 'center' } });
