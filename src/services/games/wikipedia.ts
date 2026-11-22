import { Platform } from 'react-native';

import { AppError } from '@/lib/errors';
import { TRIVIAL_RADIUS_M, parseGeoPlaces, type WikiPlace } from '@/lib/games/trivial';

/**
 * Sitios de Wikipedia en español cerca de un punto (#48, Trivial del camino), con GeoSearch y el
 * principio de cada artículo. Sin clave; `origin=*` permite llamarla desde la web.
 */
const API = 'https://es.wikipedia.org/w/api.php';

export async function fetchNearbyPlaces(here: { lat: number; lon: number }): Promise<WikiPlace[]> {
  const params = new URLSearchParams({
    action: 'query',
    format: 'json',
    formatversion: '2',
    origin: '*',
    generator: 'geosearch',
    ggscoord: `${here.lat}|${here.lon}`,
    ggsradius: String(TRIVIAL_RADIUS_M),
    ggslimit: '30',
    prop: 'coordinates|extracts',
    colimit: '30',
    exintro: '1',
    explaintext: '1',
    exsentences: '3',
    exlimit: '20',
  });
  let response: Response;
  try {
    // En la web el navegador pone su propia identificación; en el móvil, Wikipedia pide una.
    response = await fetch(`${API}?${params.toString()}`, {
      headers: Platform.OS === 'web' ? undefined : { 'Api-User-Agent': 'COPI/1.0 (proyecto de clase, UCO)' },
    });
  } catch (error) {
    throw new AppError('No hay conexión. Revisa internet y vuelve a intentarlo.', { details: error });
  }
  if (!response.ok) throw new AppError('Wikipedia no responde ahora mismo. Probad en un rato.', { details: response.status });
  return parseGeoPlaces(await response.json(), here);
}
