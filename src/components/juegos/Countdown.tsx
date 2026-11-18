import { memo } from 'react';
import { StyleSheet, View } from 'react-native';
import Svg, { Circle } from 'react-native-svg';

import { AppText } from '@/components/ui';
import { useTheme } from '@/theme';

type Props = { secondsLeft: number; totalSeconds: number; size?: number };

/** Cuenta atrás en un anillo que se vacía. */
function CountdownBase({ secondsLeft, totalSeconds, size = 72 }: Props) {
  const { colors } = useTheme();
  const stroke = 6;
  const r = (size - stroke) / 2;
  const circumference = 2 * Math.PI * r;
  const fraction = totalSeconds > 0 ? Math.max(0, Math.min(1, secondsLeft / totalSeconds)) : 0;
  const urgent = secondsLeft <= 5;
  return (
    <View style={{ width: size, height: size }} accessible accessibilityRole="timer" accessibilityLabel={`Quedan ${secondsLeft} segundos`}>
      <Svg width={size} height={size}>
        <Circle cx={size / 2} cy={size / 2} r={r} stroke={colors.surfaceStrong} strokeWidth={stroke} fill="none" />
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          stroke={urgent ? colors.danger : colors.primary}
          strokeWidth={stroke}
          fill="none"
          strokeLinecap="round"
          strokeDasharray={`${circumference} ${circumference}`}
          strokeDashoffset={circumference * (1 - fraction)}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
      </Svg>
      <View style={StyleSheet.absoluteFill}>
        <View style={styles.center}>
          <AppText variant="title" color={urgent ? colors.danger : colors.text}>
            {secondsLeft}
          </AppText>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({ center: { flex: 1, alignItems: 'center', justifyContent: 'center' } });

export const Countdown = memo(CountdownBase);
