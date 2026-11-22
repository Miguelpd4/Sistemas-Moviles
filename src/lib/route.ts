import { haversineM } from './distance';

/** Mapa en vivo y hora de llegada (#29): lectura de OSRM (rutas) y Nominatim (buscar sitios). */

export type LatLon = { lat: number; lon: number };
export type Route = { distanceM: number; durationS: number; path: [number, number][] };
export type Place = { name: string; detail: string; lat: number; lon: number };

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

/** Respuesta de OSRM `/route/v1/driving/...?overview=full&geometries=geojson` → ruta, o null. */
export function parseOsrmRoute(json: unknown): Route | null {
  if (!isRecord(json) || json.code !== 'Ok' || !Array.isArray(json.routes)) return null;
  const route: unknown = json.routes[0];
  if (!isRecord(route) || typeof route.distance !== 'number' || typeof route.duration !== 'number') return null;
  const geometry = route.geometry;
  const coords = isRecord(geometry) && Array.isArray(geometry.coordinates) ? geometry.coordinates : [];
  // GeoJSON va en [lon, lat]; Leaflet quiere [lat, lon].
  const path = coords.flatMap((c: unknown): [number, number][] =>
    Array.isArray(c) && typeof c[0] === 'number' && typeof c[1] === 'number' ? [[c[1], c[0]]] : [],
  );
  return { distanceM: Math.round(route.distance), durationS: Math.round(route.duration), path };
}

/** Respuesta de Nominatim `/search?format=jsonv2` → sitios con nombre corto y detalle. */
export function parsePlaces(json: unknown): Place[] {
  if (!Array.isArray(json)) return [];
  return json.flatMap((item: unknown): Place[] => {
    if (!isRecord(item)) return [];
    const lat = Number(item.lat);
    const lon = Number(item.lon);
    const full = typeof item.display_name === 'string' ? item.display_name : '';
    if (!Number.isFinite(lat) || !Number.isFinite(lon) || full === '') return [];
    const parts = full.split(',').map((part) => part.trim());
    const name = (typeof item.name === 'string' && item.name !== '' ? item.name : parts[0]) ?? full;
    return [{ name, detail: parts.filter((part) => part !== name).slice(0, 3).join(', '), lat, lon }];
  });
}

/** Hora de llegada («18:42») si quedan `durationS` segundos desde `now`. */
export function arrivalClock(now: number, durationS: number): string {
  return new Date(now + Math.max(0, durationS) * 1000).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
}

/** Cuándo volver a pedir la ruta: al cambiar de destino, al salirse de ella o cada 5 min. */
export const ROUTE_OFF_M = 120;
export const ROUTE_MAX_AGE_MS = 300_000;
/** Como mucho una petición cada 20 s aunque sigáis fuera de la ruta (OSRM es un servidor público). */
export const ROUTE_MIN_GAP_MS = 20_000;

export function shouldRefreshRoute(
  last: { to: LatLon; at: number } | null,
  to: LatLon,
  now: number,
  offRouteM: number,
): boolean {
  if (last === null) return true;
  if (last.to.lat !== to.lat || last.to.lon !== to.lon) return true;
  if (now - last.at < ROUTE_MIN_GAP_MS) return false;
  return offRouteM > ROUTE_OFF_M || now - last.at > ROUTE_MAX_AGE_MS;
}

export type RouteProgress = {
  /** Lo que queda de ruta desde el punto más cercano a la posición. */
  remainingM: number;
  remainingS: number;
  /** A cuántos metros de la ruta está la posición (si es mucho, hay que recalcularla). */
  offRouteM: number;
  /** El trozo que queda por recorrer, empezando en la posición. */
  path: [number, number][];
};

/** Cuánto queda de una ruta estando en `pos`, como hace un navegador al avanzar. */
export function routeProgress(route: Route, pos: LatLon): RouteProgress {
  const { path } = route;
  if (path.length < 2) {
    return { remainingM: route.distanceM, remainingS: route.durationS, offRouteM: 0, path: [[pos.lat, pos.lon], ...path] };
  }
  const point = (p: [number, number]): LatLon => ({ lat: p[0], lon: p[1] });
  let nearest = 0;
  let nearestM = Infinity;
  const cumulative: number[] = [0];
  let total = 0;
  path.forEach((p, i) => {
    const prev = path[i - 1];
    if (prev) {
      total += haversineM(point(prev), point(p));
      cumulative.push(total);
    }
    const d = haversineM(pos, point(p));
    if (d < nearestM) {
      nearestM = d;
      nearest = i;
    }
  });
  const ratio = total > 0 ? Math.max(0, total - (cumulative[nearest] ?? 0)) / total : 1;
  return {
    remainingM: Math.round(route.distanceM * ratio),
    remainingS: Math.round(route.durationS * ratio),
    offRouteM: Math.round(nearestM),
    path: [[pos.lat, pos.lon], ...path.slice(nearest + 1)],
  };
}
