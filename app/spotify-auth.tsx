import { router } from 'expo-router';
import { useEffect } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { colors } from '@/theme';

/**
 * Spotify vuelve a la app con copi://spotify-auth?code=... La sesión de expo-auth-session ya
 * recoge el código; esta ruta solo evita la pantalla «no existe» y vuelve atrás.
 */
export default function SpotifyAuthRedirect() {
  useEffect(() => {
    const timer = setTimeout(() => {
      if (router.canGoBack()) router.back();
      else router.replace('/');
    }, 300);
    return () => clearTimeout(timer);
  }, []);

  return (
    <View style={styles.center}>
      <ActivityIndicator color={colors.primary} />
    </View>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.background },
});
