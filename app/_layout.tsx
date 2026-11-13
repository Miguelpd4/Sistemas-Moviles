import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';

import { AuthProvider } from '@/context/AuthProvider';
import { colors } from '@/theme';
// Registra la tarea de GPS en segundo plano al arrancar (Android la necesita definida antes de usarla).
import '@/services/location/tracking';

export default function RootLayout() {
  return (
    <AuthProvider>
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
        <Stack.Screen name="spotify-auth" options={{ animation: 'none' }} />
        <Stack.Screen name="dev/spotify" options={{ headerShown: true, title: 'Prueba de Spotify' }} />
        <Stack.Screen name="dev/gps" options={{ headerShown: true, title: 'Prueba de GPS' }} />
      </Stack>
    </AuthProvider>
  );
}
