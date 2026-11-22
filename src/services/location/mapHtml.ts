/**
 * Página del mapa en vivo (#29) con Leaflet y OpenStreetMap. Recibe el estado con
 * `window.copiMap('<json>')` (Android, WebView) o con postMessage (web, iframe):
 * { car: {lat, lon} | null, dest: {lat, lon, name} | null, path: [[lat, lon]...], follow: boolean }
 */
export function buildMapHtml(primary: string): string {
  return `<!doctype html>
<html>
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1">
<link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css">
<style>html,body,#map{margin:0;padding:0;height:100%;background:#1a1b1e}
.copi-car{width:18px;height:18px;border-radius:50%;background:${primary};border:3px solid #fff;box-shadow:0 0 0 6px rgba(255,107,26,.25)}</style>
</head>
<body>
<div id="map"></div>
<script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
<script>
var map = L.map('map', { zoomControl: false, attributionControl: true }).setView([40.0, -3.7], 5);
L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
  maxZoom: 19, attribution: '&copy; OpenStreetMap'
}).addTo(map);
var carIcon = L.divIcon({ className: '', html: '<div class="copi-car"></div>', iconSize: [18, 18], iconAnchor: [9, 9] });
var car = null, dest = null, line = null, fitted = false;
function apply(state) {
  if (state.car) {
    var p = [state.car.lat, state.car.lon];
    if (!car) car = L.marker(p, { icon: carIcon }).addTo(map); else car.setLatLng(p);
  } else if (car) { map.removeLayer(car); car = null; }
  if (state.dest) {
    var d = [state.dest.lat, state.dest.lon];
    if (!dest) dest = L.marker(d).addTo(map); else dest.setLatLng(d);
    dest.bindTooltip(state.dest.name || 'Destino');
  } else if (dest) { map.removeLayer(dest); dest = null; }
  if (line) { map.removeLayer(line); line = null; }
  if (state.path && state.path.length > 1) line = L.polyline(state.path, { color: '${primary}', weight: 5, opacity: 0.85 }).addTo(map);
  var points = [];
  if (car) points.push(car.getLatLng());
  if (dest) points.push(dest.getLatLng());
  if (!fitted && points.length === 2) { map.fitBounds(L.latLngBounds(points), { padding: [40, 40] }); fitted = true; }
  else if (state.follow && car) map.panTo(car.getLatLng());
  else if (!fitted && points.length === 1) map.setView(points[0], 14);
}
window.copiMap = function (json) { try { apply(JSON.parse(json)); } catch (e) {} };
window.addEventListener('message', function (e) {
  if (typeof e.data === 'string' && e.data.indexOf('{"copiMap"') === 0) {
    try { apply(JSON.parse(e.data).copiMap); } catch (err) {}
  }
});
</script>
</body>
</html>`;
}
