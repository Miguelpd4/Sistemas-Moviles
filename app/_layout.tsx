import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';

import { colors } from '@/theme';

export default function RootLayout() {
  return (
    <>
      <StatusBar style="dark" />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: colors.background },
        }}
      >
        <Stack.Screen name="(inicio)" />
        <Stack.Screen name="sala/[sessionId]" />
        <Stack.Screen name="conductor/index" options={{ gestureEnabled: false }} />
        <Stack.Screen name="resumen/[sessionId]" />
        <Stack.Screen name="c/[carCode]" />
      </Stack>
    </>
  );
}
