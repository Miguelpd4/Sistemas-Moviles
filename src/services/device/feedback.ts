import * as Haptics from 'expo-haptics';
import * as Speech from 'expo-speech';
import { Platform } from 'react-native';

/** Vibración y voz (S2-04, S2-07). En la web no hay vibración; la voz usa la del navegador. */

export function vibrate(kind: 'tap' | 'success' | 'warning' = 'tap'): void {
  if (Platform.OS === 'web') return;
  const run =
    kind === 'tap'
      ? Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)
      : Haptics.notificationAsync(kind === 'success' ? Haptics.NotificationFeedbackType.Success : Haptics.NotificationFeedbackType.Warning);
  run.catch(() => undefined);
}

export function speak(text: string): void {
  try {
    Speech.stop();
    Speech.speak(text, { language: 'es-ES', rate: 1 });
  } catch {
    // Sin voz disponible: se queda el aviso en pantalla.
  }
}
