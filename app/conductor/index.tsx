import { StatusBar } from 'expo-status-bar';
import { StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppText } from '@/components/ui';
import { driverColors, spacing } from '@/theme';

// TODO(entrada): llegada, km, pasajeros, QR, botón "Hablar" y "Finalizar viaje" (docs/diseno/3_modo_conductor.jpg).
export default function ModoConductorScreen() {
  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar style="light" />
      <View style={styles.content}>
        <AppText variant="heading" color={driverColors.text} accessibilityRole="header">
          Modo conductor
        </AppText>
        <AppText style={styles.big} color={driverColors.text}>
          --:--
        </AppText>
        <AppText variant="heading" color={driverColors.textSecondary}>
          Pantalla en construcción
        </AppText>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: driverColors.background },
  content: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: spacing.md },
  big: { fontSize: 96, lineHeight: 104, fontWeight: '800' },
});
