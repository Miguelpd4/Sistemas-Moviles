import { useImperativeHandle, useMemo, useRef, type Ref } from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { WebView as RNWebView, type WebViewMessageEvent } from 'react-native-webview';

import { env } from '@/config/env';
import { parsePlayerEvent } from '@/lib/youtube';
import { buildPlayerHtml } from '@/services/youtube/playerHtml';
import type { YouTubePlayerCommand, YouTubePlayerEvent } from '@/types/youtube';

// Los tipos de react-native-webview usan `WebViewProps & P` con P = undefined por defecto, que en
// TypeScript 6 da `never`: se fija P a un objeto vacío.
const WebView = RNWebView<object>;
type WebViewInstance = InstanceType<typeof WebView>;

export type YouTubePlayerHandle = {
  send: (command: YouTubePlayerCommand) => void;
};

type Props = {
  ref?: Ref<YouTubePlayerHandle>;
  onEvent: (event: YouTubePlayerEvent) => void;
  style?: StyleProp<ViewStyle>;
};

/**
 * Reproductor de YouTube dentro de COPI en Android (#54): la API IFrame oficial en un WebView.
 * YouTube exige que el vídeo se vea, así que no puede estar oculto ni sonar en segundo plano.
 */
export function YouTubePlayer({ ref, onEvent, style }: Props) {
  const webRef = useRef<WebViewInstance>(null);
  // Con el dominio de la web como base, YouTube sabe desde dónde se reproduce (sin error 153).
  const source = useMemo(() => ({ html: buildPlayerHtml(env.webUrl), baseUrl: `${env.webUrl}/` }), []);

  useImperativeHandle(
    ref,
    () => ({
      send: (command) => {
        // Doble JSON.stringify: el JSON de la orden viaja como texto dentro del JavaScript.
        webRef.current?.injectJavaScript(`window.copiCommand(${JSON.stringify(JSON.stringify(command))}); true;`);
      },
    }),
    [],
  );

  const onMessage = (event: WebViewMessageEvent) => {
    const parsed = parsePlayerEvent(event.nativeEvent.data);
    if (parsed) onEvent(parsed);
  };

  return (
    <View style={[styles.box, style]}>
      <WebView
        ref={webRef}
        source={source}
        originWhitelist={['*']}
        javaScriptEnabled
        domStorageEnabled
        allowsInlineMediaPlayback
        mediaPlaybackRequiresUserAction={false}
        allowsFullscreenVideo={false}
        setSupportMultipleWindows={false}
        onMessage={onMessage}
        style={styles.web}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  box: { aspectRatio: 16 / 9, width: '100%', overflow: 'hidden', backgroundColor: '#000' },
  web: { flex: 1, backgroundColor: '#000' },
});
