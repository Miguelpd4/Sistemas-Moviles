import { router } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import { useEffect } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { useTheme } from '@/theme';

// En la web, Spotify vuelve a esta ruta dentro de la ventana emergente del inicio de sesión: así
// le pasa el código a la pestaña del Modo conductor y se cierra (en Android no hace nada).
WebBrowser.maybeCompleteAuthSession();

/**
 * Spotify vuelve a la app con copi://spotify-auth?code=... (o https://<web>/spotify-auth en la web).
 * La sesión de expo-auth-session ya recoge el código; esta ruta solo evita la pantalla «no existe»
 * y vuelve atrás.
 */
export default function SpotifyAuthRedirect() {
  const { colors } = useTheme();
  useEffect(() => {
    const timer = setTimeout(() => {
      if (router.canGoBack()) router.back();
      else router.replace('/');
    }, 300);
    return () => clearTimeout(timer);
  }, []);

  return (
    <View style={[styles.center, { backgroundColor: colors.background }]}>
      <ActivityIndicator color={colors.primary} />
    </View>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
});
