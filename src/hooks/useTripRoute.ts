import { useEffect, useRef, useState } from 'react';

import { errorMessage } from '@/lib/errors';
import { arrivalClock, shouldRefreshRoute, type LatLon, type Route } from '@/lib/route';
import { getRoute } from '@/services/location/maps';

import { useNow } from './useNow';

type Computed = { key: string; route: Route | null; at: number };

/**
 * Ruta y tiempo hasta el destino (#29) desde la última posición del coche. Solo la vuelve a pedir
 * al cambiar de destino, al moverse más de 300 m o cada 2 min (OSRM es un servidor público).
 */
export function useTripRoute(car: LatLon | null, dest: LatLon | null) {
  const now = useNow(30_000);
  const lastRef = useRef<{ from: LatLon; to: LatLon; at: number } | null>(null);
  const [computed, setComputed] = useState<Computed | null>(null);
  const [error, setError] = useState<string | null>(null);
  const destKey = dest ? `${dest.lat},${dest.lon}` : null;
  const carLat = car?.lat ?? null;
  const carLon = car?.lon ?? null;

  useEffect(() => {
    if (carLat === null || carLon === null || dest === null || destKey === null) return;
    const from = { lat: carLat, lon: carLon };
    if (!shouldRefreshRoute(lastRef.current, from, dest, now)) return;
    lastRef.current = { from, to: dest, at: now };
    let active = true;
    getRoute(from, dest)
      .then((route) => {
        if (!active) return;
        setComputed({ key: destKey, route, at: Date.now() });
        setError(route ? null : 'No hay ruta en coche hasta ese destino.');
      })
      .catch((err: unknown) => active && setError(errorMessage(err, 'No se ha podido calcular la ruta.')));
    return () => {
      active = false;
    };
    // dest se compara por su clave (lat,lon) para no repetir la petición en cada render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [carLat, carLon, destKey, now]);

  // La ruta solo vale para el destino actual; el tiempo se descuenta desde que se calculó.
  const route = computed !== null && computed.key === destKey ? computed.route : null;
  const remainingS = route && computed ? Math.max(0, route.durationS - (now - computed.at) / 1000) : null;
  // Hora de llegada: desde que se calculó la ruta (no cambia en cada render).
  const arrival = route && computed ? arrivalClock(computed.at, route.durationS) : null;
  return { route, remainingS, arrival, error: destKey ? error : null };
}
