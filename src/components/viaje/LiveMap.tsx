import { useEffect, useMemo, useRef, useState } from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { WebView as RNWebView } from 'react-native-webview';

import { env } from '@/config/env';
import { buildMapHtml } from '@/services/location/mapHtml';
import { useTheme } from '@/theme';

import type { MapState } from './mapState';

// Igual que en YouTubePlayer: con P = undefined los tipos de react-native-webview dan `never`.
const WebView = RNWebView<object>;
type WebViewInstance = InstanceType<typeof WebView>;

type Props = { state: MapState; style?: StyleProp<ViewStyle> };

/** Mapa en vivo (#29) en Android: Leaflet y OpenStreetMap en un WebView. */
export function LiveMap({ state, style }: Props) {
  const { colors } = useTheme();
  const webRef = useRef<WebViewInstance>(null);
  const [ready, setReady] = useState(false);
  // Con el dominio de la web como base, los mosaicos de OpenStreetMap llevan un Referer válido.
  const source = useMemo(() => ({ html: buildMapHtml(colors.primary), baseUrl: `${env.webUrl}/` }), [colors.primary]);
  const json = JSON.stringify(state);

  useEffect(() => {
    if (ready) webRef.current?.injectJavaScript(`window.copiMap(${JSON.stringify(json)}); true;`);
  }, [ready, json]);

  return (
    <View style={[styles.box, style]}>
      <WebView
        ref={webRef}
        source={source}
        originWhitelist={['*']}
        javaScriptEnabled
        domStorageEnabled
        onLoadEnd={() => setReady(true)}
        style={styles.web}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  box: { height: 260, width: '100%', overflow: 'hidden', borderRadius: 16 },
  web: { flex: 1 },
});
