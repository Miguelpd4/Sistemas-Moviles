/** Distancia recorrida a partir de puntos GPS. */

export type GeoPoint = {
  lat: number;
  lon: number;
  /** Precisión en metros (cuanto menor, mejor). */
  accuracy?: number | null;
  /** Instante en milisegundos. */
  timestamp: number;
};

const EARTH_RADIUS_M = 6_371_008.8;
/** Puntos con peor precisión se descartan. */
export const MAX_ACCURACY_M = 50;
/** Saltos más rápidos que esto (unos 200 km/h) son errores del GPS. */
export const MAX_SPEED_MPS = 55;

const toRad = (deg: number) => (deg * Math.PI) / 180;

export function haversineM(a: Pick<GeoPoint, 'lat' | 'lon'>, b: Pick<GeoPoint, 'lat' | 'lon'>): number {
  const dLat = toRad(b.lat - a.lat);
  const dLon = toRad(b.lon - a.lon);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLon / 2) ** 2;
  return 2 * EARTH_RADIUS_M * Math.asin(Math.min(1, Math.sqrt(h)));
}

/** Suma los tramos entre puntos válidos consecutivos. Devuelve metros enteros. */
export function totalDistanceM(points: readonly GeoPoint[]): number {
  let total = 0;
  let last: GeoPoint | null = null;

  for (const point of points) {
    if (point.accuracy != null && point.accuracy > MAX_ACCURACY_M) continue;
    if (last === null) {
      last = point;
      continue;
    }
    const meters = haversineM(last, point);
    const seconds = (point.timestamp - last.timestamp) / 1000;
    if (seconds <= 0 && meters > 0) continue;
    if (seconds > 0 && meters / seconds > MAX_SPEED_MPS) continue;
    total += meters;
    last = point;
  }
  return Math.round(total);
}
