import { memo } from 'react';
import { StyleSheet, View } from 'react-native';

import { AppText } from '@/components/ui';
import { fonts, plate, spacing, typography } from '@/theme';

type Props = {
  code: string;
  size?: 'sm' | 'md' | 'lg';
};

const SCALE = { sm: 0.72, md: 1, lg: 1.45 } as const;

/**
 * El código del coche como una matrícula europea: banda azul con la E de España y letras negras
 * sobre blanco. Es el elemento con el que se reconoce el coche en toda la app.
 */
function LicensePlateBase({ code, size = 'md' }: Props) {
  const scale = SCALE[size];
  return (
    <View
      style={[styles.plate, { borderRadius: 6 * scale, borderWidth: Math.max(1.5, 2 * scale) }]}
      accessible
      accessibilityRole="text"
      accessibilityLabel={`Código del coche: ${code.split('').join(' ')}`}
    >
      <View style={[styles.band, { width: 22 * scale, paddingVertical: 4 * scale }]}>
        <View
          style={[
            styles.stars,
            { width: 10 * scale, height: 10 * scale, borderRadius: 5 * scale, borderWidth: Math.max(1, 1.5 * scale) },
          ]}
        />
        <AppText
          color={plate.bandText}
          style={{ fontFamily: fonts.black, fontSize: 11 * scale, lineHeight: 13 * scale }}
          maxFontSizeMultiplier={1}
        >
          E
        </AppText>
      </View>
      <AppText
        color={plate.text}
        maxFontSizeMultiplier={1.2}
        style={[
          typography.plate,
          {
            fontSize: typography.plate.fontSize * scale,
            lineHeight: typography.plate.lineHeight * scale,
            letterSpacing: typography.plate.letterSpacing * scale,
            paddingHorizontal: spacing.sm * scale + 2,
            paddingVertical: 3 * scale,
          },
        ]}
      >
        {code}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  plate: {
    flexDirection: 'row',
    alignItems: 'stretch',
    alignSelf: 'flex-start',
    backgroundColor: plate.background,
    borderColor: plate.border,
    overflow: 'hidden',
  },
  band: { backgroundColor: plate.band, alignItems: 'center', justifyContent: 'space-between' },
  stars: { borderColor: plate.stars, borderStyle: 'dotted' },
});

export const LicensePlate = memo(LicensePlateBase);
