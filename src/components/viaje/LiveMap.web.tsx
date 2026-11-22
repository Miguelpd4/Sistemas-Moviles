import { useEffect, useMemo, useRef, useState } from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { buildMapHtml } from '@/services/location/mapHtml';
import { useTheme } from '@/theme';

import type { MapState } from './mapState';

type Props = { state: MapState; style?: StyleProp<ViewStyle> };

/** Mapa en vivo (#29) en la web: la misma página de Leaflet en un iframe. */
export function LiveMap({ state, style }: Props) {
  const { colors } = useTheme();
  const frameRef = useRef<HTMLIFrameElement>(null);
  const [ready, setReady] = useState(false);
  const html = useMemo(() => buildMapHtml(colors.primary), [colors.primary]);
  const json = JSON.stringify({ copiMap: state });

  useEffect(() => {
    if (ready) frameRef.current?.contentWindow?.postMessage(json, '*');
  }, [ready, json]);

  return (
    <View style={[styles.box, style]}>
      <iframe
        ref={frameRef}
        title="Mapa del viaje"
        srcDoc={html}
        onLoad={() => setReady(true)}
        style={{ border: 0, width: '100%', height: '100%' }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  box: { height: 260, width: '100%', overflow: 'hidden', borderRadius: 16 },
});
