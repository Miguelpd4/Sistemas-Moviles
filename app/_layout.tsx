import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import * as SystemUI from 'expo-system-ui';
import { useEffect, type ReactNode } from 'react';

import { AuthProvider } from '@/context/AuthProvider';
import { ThemeProvider, fonts, useTheme } from '@/theme';
// Registra la tarea de GPS en segundo plano al arrancar (Android la necesita definida antes de usarla).
import '@/services/location/tracking';

void SplashScreen.preventAutoHideAsync().catch(() => undefined);

const FONT_FILES = {
  [fonts.regular]: require('../assets/fonts/Inter-Regular.otf'),
  [fonts.medium]: require('../assets/fonts/Inter-Medium.otf'),
  [fonts.semibold]: require('../assets/fonts/Inter-SemiBold.otf'),
  [fonts.bold]: require('../assets/fonts/Inter-Bold.otf'),
  [fonts.displayBold]: require('../assets/fonts/InterDisplay-Bold.otf'),
  [fonts.display]: require('../assets/fonts/InterDisplay-ExtraBold.otf'),
  [fonts.black]: require('../assets/fonts/InterDisplay-Black.otf'),
};

export default function RootLayout() {
  const [loaded, fontError] = useFonts(FONT_FILES);
  const ready = loaded || fontError !== null;

  useEffect(() => {
    if (ready) void SplashScreen.hideAsync().catch(() => undefined);
  }, [ready]);

  // Si la fuente falla, la app sigue con la del sistema.
  if (!ready) return null;

  return (
    <ThemeProvider>
      <AuthProvider>
        <ThemedStack />
      </AuthProvider>
    </ThemeProvider>
  );
}

function ThemedStack(): ReactNode {
  const { colors, scheme } = useTheme();

  // Fondo de la ventana (se ve un instante al cambiar de pantalla) del color del tema.
  useEffect(() => {
    void SystemUI.setBackgroundColorAsync(colors.background).catch(() => undefined);
  }, [colors.background]);

  return (
    <>
      <StatusBar style={scheme === 'dark' ? 'light' : 'dark'} />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: colors.background },
          animation: 'fade_from_bottom',
        }}
      >
        <Stack.Screen name="(inicio)" />
        <Stack.Screen name="sala/[sessionId]" />
        <Stack.Screen name="conductor/index" options={{ gestureEnabled: false, animation: 'fade' }} />
        <Stack.Screen name="resumen/[sessionId]" />
        <Stack.Screen name="c/[carCode]" />
        <Stack.Screen
          name="dev/youtube"
          options={{
            headerShown: true,
            title: 'Prueba de YouTube',
            headerStyle: { backgroundColor: colors.background },
            headerTintColor: colors.text,
          }}
        />
        <Stack.Screen
          name="dev/gps"
          options={{
            headerShown: true,
            title: 'Prueba de GPS',
            headerStyle: { backgroundColor: colors.background },
            headerTintColor: colors.text,
          }}
        />
      </Stack>
    </>
  );
}
