import { router } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import { useEffect } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { useTheme } from '@/theme';

// En la web, Google vuelve a esta ruta dentro de la ventana emergente del inicio de sesión: así le
// pasa el token a la pestaña de COPI y se cierra.
WebBrowser.maybeCompleteAuthSession();

/** Vuelta del inicio de sesión de Google en la web (#54). Si no es una ventana emergente, vuelve atrás. */
export default function YouTubeAuthRedirect() {
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
