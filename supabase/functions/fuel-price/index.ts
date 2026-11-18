// S2-08 · Precio medio del combustible en las 10 gasolineras más cercanas, con la API REST de
// carburantes del Ministerio. Un precio se reutiliza 12 horas para la misma zona (1 decimal de
// latitud y longitud, unos 11 km) y el mismo combustible, guardado en fuel_price_cache.
// Petición: POST { "lat": 37.88, "lon": -4.78, "fuel": "diesel" } → { priceEurL, cached, ... }
// Despliegue: npx supabase functions deploy fuel-price
import { createClient } from 'npm:@supabase/supabase-js@2';

import { isAuthenticated } from '../_shared/auth.ts';
import { corsHeaders, json } from '../_shared/cors.ts';

const SOURCE =
  'https://sedeaplicaciones.minetur.gob.es/ServiciosRESTCarburantes/PreciosCarburantes/EstacionesTerrestres/';

// Nombres de los campos de precio en la respuesta del Ministerio.
// Comprobad en la primera llamada que siguen siendo estos (se registran con console.log).
const FIELD_BY_FUEL: Record<string, string> = {
  gasolina_95: 'Precio Gasolina 95 E5',
  gasolina_98: 'Precio Gasolina 98 E5',
  diesel: 'Precio Gasoleo A',
  glp: 'Precio Gases licuados del petróleo',
};

type Station = Record<string, string>;

/** "1,559" → 1.559; "" → null */
const parseSpanishNumber = (value: string | undefined): number | null => {
  if (!value) return null;
  const n = Number(value.replace(',', '.'));
  return Number.isFinite(n) ? n : null;
};

const toRad = (deg: number) => (deg * Math.PI) / 180;
function distanceKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const h =
    Math.sin(toRad(lat2 - lat1) / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(toRad(lon2 - lon1) / 2) ** 2;
  return 2 * 6371 * Math.asin(Math.sqrt(h));
}

// Caché en memoria del listado (el archivo pesa varios MB y cambia pocas veces al día).
let cache: { stations: Station[]; fetchedAt: number } | null = null;
const CACHE_MS = 60 * 60 * 1000;
/** Validez de un precio guardado en fuel_price_cache. */
const PRICE_TTL_MS = 12 * 60 * 60 * 1000;

// La tabla fuel_price_cache no tiene políticas: solo se lee y escribe con la clave de servicio.
const admin = createClient(Deno.env.get('SUPABASE_URL') ?? '', Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '', {
  auth: { persistSession: false },
});

const cacheKey = (fuel: string, lat: number, lon: number) => `${fuel}:${lat.toFixed(1)},${lon.toFixed(1)}`;

async function readCachedPrice(key: string): Promise<number | null> {
  const { data, error } = await admin.from('fuel_price_cache').select('price_eur_l, fetched_at').eq('cache_key', key).maybeSingle();
  if (error || !data) return null;
  if (Date.now() - new Date(data.fetched_at).getTime() > PRICE_TTL_MS) return null;
  return Number(data.price_eur_l);
}

async function saveCachedPrice(key: string, price: number): Promise<void> {
  const { error } = await admin
    .from('fuel_price_cache')
    .upsert({ cache_key: key, price_eur_l: price, fetched_at: new Date().toISOString() });
  if (error) console.error('fuel-price · no se ha podido guardar en la caché', error.message);
}

async function loadStations(): Promise<{ stations: Station[]; cached: boolean; ms: number }> {
  if (cache && Date.now() - cache.fetchedAt < CACHE_MS) return { stations: cache.stations, cached: true, ms: 0 };
  const started = Date.now();
  const response = await fetch(SOURCE, { headers: { Accept: 'application/json' } });
  if (!response.ok) throw new Error(`API del Ministerio: ${response.status}`);
  const body = (await response.json()) as { ListaEESSPrecio?: Station[] };
  const stations = body.ListaEESSPrecio ?? [];
  if (stations[0]) console.log('fuel-price · campos de una estación:', Object.keys(stations[0]).join(' | '));
  cache = { stations, fetchedAt: Date.now() };
  return { stations, cached: false, ms: Date.now() - started };
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    if (!(await isAuthenticated(req))) return json({ error: 'Inicia sesión.' }, 401);

    const { lat, lon, fuel } = (await req.json().catch(() => ({}))) as { lat?: unknown; lon?: unknown; fuel?: unknown };
    if (typeof lat !== 'number' || typeof lon !== 'number' || typeof fuel !== 'string' || !FIELD_BY_FUEL[fuel]) {
      return json({ error: 'Faltan lat, lon o fuel (gasolina_95, gasolina_98, diesel, glp).' }, 400);
    }
    const field = FIELD_BY_FUEL[fuel];
    const key = cacheKey(fuel, lat, lon);

    const cachedPrice = await readCachedPrice(key);
    if (cachedPrice !== null) return json({ priceEurL: cachedPrice, cached: true, stations: 10, maxDistanceKm: 0, sourceMs: 0 });

    const { stations, cached, ms } = await loadStations();
    const nearest = stations
      .map((station) => {
        const sLat = parseSpanishNumber(station['Latitud']);
        const sLon = parseSpanishNumber(station['Longitud (WGS84)']);
        const price = parseSpanishNumber(station[field]);
        if (sLat === null || sLon === null || price === null || price <= 0) return null;
        return { price, km: distanceKm(lat, lon, sLat, sLon) };
      })
      .filter((entry): entry is { price: number; km: number } => entry !== null)
      .sort((a, b) => a.km - b.km)
      .slice(0, 10);

    if (nearest.length === 0) return json({ error: 'No hay precios cerca para ese combustible.' }, 404);
    const average = nearest.reduce((sum, entry) => sum + entry.price, 0) / nearest.length;

    return json({
      priceEurL: Math.round(average * 1000) / 1000,
      stations: nearest.length,
      maxDistanceKm: Math.round(nearest[nearest.length - 1].km * 10) / 10,
      cached,
      sourceMs: ms,
    });
  } catch (error) {
    console.error('fuel-price', error);
    return json({ error: 'No se ha podido consultar el precio del combustible.' }, 502);
  }
});
