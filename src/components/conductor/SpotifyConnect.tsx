import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { useEffect, useState } from 'react';
import { Platform, StyleSheet, View } from 'react-native';

import { AppText, Button } from '@/components/ui';
import { getAccountName } from '@/services/spotify/player';
import { driverColors, radius, spacing } from '@/theme';

type Props = {
  connected: boolean;
  ready: boolean;
  busy: boolean;
  error: string | null;
  playerError: string | null;
  isPlaying: boolean;
  onConnect: () => void;
};

const isWeb = Platform.OS === 'web';

/**
 * Estado de Spotify en el Modo conductor: conectar la cuenta o ver que está sonando. Desde la web
 * (para pruebas) no suena en el navegador: controla la app de Spotify abierta con la cuenta.
 */
export function SpotifyConnect({ connected, ready, busy, error, playerError, isPlaying, onConnect }: Props) {
  const [account, setAccount] = useState<string | null>(null);

  useEffect(() => {
    if (!connected) return;
    let active = true;
    getAccountName()
      .then((name) => active && setAccount(name))
      .catch(() => undefined);
    return () => {
      active = false;
    };
  }, [connected]);

  return (
    <View style={styles.box}>
      <View style={styles.row}>
        <MaterialCommunityIcons name="spotify" size={32} color={connected ? driverColors.accent : driverColors.textSecondary} />
        <View style={styles.text}>
          <AppText variant="heading" color={driverColors.text}>
            {connected ? (account ? `Spotify: ${account}` : 'Spotify conectado') : 'Música con Spotify'}
          </AppText>
          <AppText variant="caption" color={driverColors.textSecondary}>
            {connected
              ? isPlaying
                ? isWeb
                  ? 'Sonando la cola de la sala en tu app de Spotify.'
                  : 'Sonando la cola de la sala en este móvil.'
                : 'Esperando canciones de la cola.'
              : isWeb
                ? 'Conecta tu cuenta Premium y deja abierta la app de Spotify (en el ordenador o en el móvil): sonará ahí.'
                : 'Conecta tu cuenta Premium para que suene la cola de la sala.'}
          </AppText>
        </View>
      </View>
      {isWeb && connected ? (
        <AppText variant="caption" color={driverColors.textSecondary}>
          Deja esta pestaña abierta y a la vista: si el navegador la pone en segundo plano, la cola tarda en pasar de canción.
        </AppText>
      ) : null}
      {playerError ? (
        <AppText variant="bodyStrong" color={driverColors.accent}>
          {playerError}
        </AppText>
      ) : null}
      {error ? (
        <AppText variant="bodyStrong" color={driverColors.accent}>
          {error}
        </AppText>
      ) : null}
      {!connected ? <Button label="Conectar Spotify" variant="driver" icon="musical-notes" loading={busy} disabled={!ready} onPress={onConnect} /> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  box: { backgroundColor: driverColors.surface, borderRadius: radius.md, padding: spacing.md, gap: spacing.sm + 2 },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  text: { flex: 1, gap: 2 },
});
