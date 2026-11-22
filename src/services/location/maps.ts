import { AppError } from '@/lib/errors';
import { parseOsrmRoute, parsePlaces, type LatLon, type Place, type Route } from '@/lib/route';

/**
 * Mapa en vivo (#29) con servicios libres de OpenStreetMap, sin claves:
 * - Nominatim para buscar el destino (máximo 1 búsqueda por segundo).
 * - OSRM (servidor público de demostración) para la ruta y el tiempo de llegada.
 * Para un proyecto de clase basta; con muchos usuarios habría que usar servidores propios.
 */

const NOMINATIM = 'https://nominatim.openstreetmap.org/search';
const OSRM = 'https://router.project-osrm.org/route/v1/driving';
const HEADERS = { Accept: 'application/json', 'Accept-Language': 'es', 'User-Agent': 'COPI/1.0 (proyecto de clase, UCO)' };

async function getJson(url: string, failMessage: string): Promise<unknown> {
  let response: Response;
  try {
    response = await fetch(url, { headers: HEADERS });
  } catch (error) {
    throw new AppError('No hay conexión. Revisa internet y vuelve a intentarlo.', { details: error });
  }
  if (!response.ok) throw new AppError(failMessage, { details: response.status });
  return response.json();
}

/** Sitios que coinciden con `query` (en España primero). */
export async function searchPlaces(query: string): Promise<Place[]> {
  const q = query.trim();
  if (q.length < 3) return [];
  const params = new URLSearchParams({ q, format: 'jsonv2', limit: '6', countrycodes: 'es', addressdetails: '0' });
  return parsePlaces(await getJson(`${NOMINATIM}?${params.toString()}`, 'No se ha podido buscar el sitio.'));
}

/** Ruta en coche de `from` a `to`, o null si no hay. */
export async function getRoute(from: LatLon, to: LatLon): Promise<Route | null> {
  const coords = `${from.lon},${from.lat};${to.lon},${to.lat}`;
  return parseOsrmRoute(await getJson(`${OSRM}/${coords}?overview=full&geometries=geojson`, 'No se ha podido calcular la ruta.'));
}
