/**
 * Página del reproductor de YouTube para el WebView de Android (#54). Usa la API IFrame oficial:
 * recibe órdenes con `window.copiCommand('<json>')` y avisa a la app con
 * `ReactNativeWebView.postMessage` ({type: ready | state | progress | error}).
 *
 * `origin` es el dominio de la web (copi-navy.vercel.app): el WebView carga esta página con ese
 * dominio como base para que YouTube sepa desde dónde se reproduce y no dé el error 153.
 */
export function buildPlayerHtml(origin: string): string {
  return `<!doctype html>
<html>
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1">
<meta name="referrer" content="strict-origin-when-cross-origin">
<style>html,body{margin:0;padding:0;height:100%;background:#000;overflow:hidden}#player{width:100%;height:100%}</style>
</head>
<body>
<div id="player"></div>
<script>
var player = null;
var ready = false;
var pending = null;
function send(message) {
  var text = JSON.stringify(message);
  if (window.ReactNativeWebView) window.ReactNativeWebView.postMessage(text);
}
function run(command) {
  if (!ready) { pending = command; return; }
  if (command.type === 'load') player.loadVideoById({ videoId: command.videoId, startSeconds: command.startSeconds || 0 });
  else if (command.type === 'play') player.playVideo();
  else if (command.type === 'pause') player.pauseVideo();
  else if (command.type === 'seek') player.seekTo(command.seconds, true);
}
window.copiCommand = function (json) {
  try { run(JSON.parse(json)); } catch (e) { send({ type: 'error', code: -1 }); }
};
function onYouTubeIframeAPIReady() {
  player = new YT.Player('player', {
    width: '100%',
    height: '100%',
    playerVars: { playsinline: 1, autoplay: 1, controls: 1, rel: 0, fs: 0, origin: ${JSON.stringify(origin)} },
    events: {
      onReady: function () {
        ready = true;
        send({ type: 'ready' });
        if (pending) { var command = pending; pending = null; run(command); }
      },
      onStateChange: function (event) { send({ type: 'state', code: event.data }); },
      onError: function (event) { send({ type: 'error', code: event.data }); }
    }
  });
  setInterval(function () {
    if (!ready || !player.getCurrentTime) return;
    send({ type: 'progress', currentMs: Math.round(player.getCurrentTime() * 1000), durationMs: Math.round((player.getDuration() || 0) * 1000) });
  }, 1000);
}
</script>
<script src="https://www.youtube.com/iframe_api"></script>
</body>
</html>`;
}
