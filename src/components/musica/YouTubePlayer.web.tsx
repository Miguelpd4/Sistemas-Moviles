import { useEffect, useImperativeHandle, useRef, type Ref } from 'react';
import { StyleSheet, View, type HostInstance, type StyleProp, type ViewStyle } from 'react-native';

import { playerStateName } from '@/lib/youtube';
import type { YouTubePlayerCommand, YouTubePlayerEvent } from '@/types/youtube';

export type YouTubePlayerHandle = {
  send: (command: YouTubePlayerCommand) => void;
};

type Props = {
  ref?: Ref<YouTubePlayerHandle>;
  onEvent: (event: YouTubePlayerEvent) => void;
  style?: StyleProp<ViewStyle>;
};

/** Lo que se usa de la API IFrame de YouTube (https://developers.google.com/youtube/iframe_api_reference). */
type YTPlayer = {
  loadVideoById: (options: { videoId: string; startSeconds?: number }) => void;
  playVideo: () => void;
  pauseVideo: () => void;
  seekTo: (seconds: number, allowSeekAhead: boolean) => void;
  getCurrentTime: () => number;
  getDuration: () => number;
  destroy: () => void;
};
type YTNamespace = {
  Player: new (
    element: HTMLElement,
    options: {
      width: string;
      height: string;
      playerVars: Record<string, string | number>;
      events: {
        onReady: () => void;
        onStateChange: (event: { data: number }) => void;
        onError: (event: { data: number }) => void;
      };
    },
  ) => YTPlayer;
};
type YTWindow = Window & { YT?: YTNamespace; onYouTubeIframeAPIReady?: () => void };

let apiPromise: Promise<YTNamespace> | null = null;

/** Carga una sola vez el script de la API IFrame. */
function loadIframeApi(): Promise<YTNamespace> {
  const win = window as YTWindow;
  if (win.YT?.Player) return Promise.resolve(win.YT);
  apiPromise ??= new Promise((resolve, reject) => {
    const previous = win.onYouTubeIframeAPIReady;
    win.onYouTubeIframeAPIReady = () => {
      previous?.();
      if (win.YT) resolve(win.YT);
    };
    const script = document.createElement('script');
    script.src = 'https://www.youtube.com/iframe_api';
    script.onerror = () => {
      apiPromise = null;
      reject(new Error('No se ha podido cargar el reproductor de YouTube.'));
    };
    document.head.appendChild(script);
  });
  return apiPromise;
}

/** Reproductor de YouTube dentro de COPI en la web (#54), con la API IFrame oficial. */
export function YouTubePlayer({ ref, onEvent, style }: Props) {
  const hostRef = useRef<HostInstance>(null);
  const playerRef = useRef<YTPlayer | null>(null);
  const readyRef = useRef(false);
  const pendingRef = useRef<YouTubePlayerCommand | null>(null);
  const onEventRef = useRef(onEvent);

  useEffect(() => {
    onEventRef.current = onEvent;
  }, [onEvent]);

  useEffect(() => {
    let cancelled = false;
    let timer: ReturnType<typeof setInterval> | null = null;
    const run = (command: YouTubePlayerCommand) => apply(playerRef.current, command);

    loadIframeApi()
      .then((YT) => {
        // En la web, la View de React Native es un <div>.
        const host = hostRef.current as unknown as HTMLElement | null;
        if (cancelled || !host) return;
        const mount = document.createElement('div');
        host.appendChild(mount);
        playerRef.current = new YT.Player(mount, {
          width: '100%',
          height: '100%',
          playerVars: { playsinline: 1, autoplay: 1, controls: 1, rel: 0, fs: 0, origin: window.location.origin },
          events: {
            onReady: () => {
              readyRef.current = true;
              onEventRef.current({ type: 'ready' });
              const pending = pendingRef.current;
              pendingRef.current = null;
              if (pending) run(pending);
            },
            onStateChange: (event) => onEventRef.current({ type: 'state', state: playerStateName(event.data) }),
            onError: (event) => onEventRef.current({ type: 'error', code: event.data }),
          },
        });
        timer = setInterval(() => {
          const player = playerRef.current;
          if (!readyRef.current || !player) return;
          onEventRef.current({
            type: 'progress',
            currentMs: Math.round(player.getCurrentTime() * 1000),
            durationMs: Math.round((player.getDuration() || 0) * 1000),
          });
        }, 1000);
      })
      .catch(() => onEventRef.current({ type: 'error', code: -1 }));

    return () => {
      cancelled = true;
      if (timer) clearInterval(timer);
      playerRef.current?.destroy();
      playerRef.current = null;
      readyRef.current = false;
    };
  }, []);

  useImperativeHandle(
    ref,
    () => ({
      send: (command) => {
        if (!readyRef.current) {
          pendingRef.current = command;
          return;
        }
        apply(playerRef.current, command);
      },
    }),
    [],
  );

  return <View ref={hostRef} style={[styles.box, style]} />;
}

function apply(player: YTPlayer | null, command: YouTubePlayerCommand) {
  if (!player) return;
  if (command.type === 'load') player.loadVideoById({ videoId: command.videoId, startSeconds: command.startSeconds });
  else if (command.type === 'play') player.playVideo();
  else if (command.type === 'pause') player.pauseVideo();
  else player.seekTo(command.seconds, true);
}

const styles = StyleSheet.create({
  box: { aspectRatio: 16 / 9, width: '100%', overflow: 'hidden', backgroundColor: '#000' },
});
