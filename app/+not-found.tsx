import { router } from 'expo-router';
import { View } from 'react-native';

import { AppText, Button, Screen } from '@/components/ui';
import { colors, spacing } from '@/theme';

export default function NotFoundScreen() {
  return (
    <Screen>
      <AppText variant="title" accessibilityRole="header">
        Esta pantalla no existe
      </AppText>
      <AppText color={colors.textSecondary}>Puede que el enlace esté mal escrito.</AppText>
      <View style={{ marginTop: spacing.md }}>
        <Button label="Volver al inicio" onPress={() => router.replace('/')} />
      </View>
    </Screen>
  );
}
