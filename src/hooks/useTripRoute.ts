import { useEffect, useMemo, useRef, useState } from 'react';

import { errorMessage } from '@/lib/errors';
import { arrivalClock, routeProgress, shouldRefreshRoute, type LatLon, type Route } from '@/lib/route';
import { getRoute } from '@/services/location/maps';

import { useNow } from './useNow';

type Computed = { key: string; route: Route };

/**
 * Ruta hasta el destino (#29) desde donde estáis, como un navegador: lo que queda (km, tiempo y
 * hora de llegada) baja al avanzar por la ruta, y se pide otra si os salís de ella, si cambia el
 * destino o cada 5 min (OSRM es un servidor público: como mucho una petición cada 20 s).
 */
export function useTripRoute(here: LatLon | null, dest: LatLon | null) {
  const now = useNow(10_000);
  const lastRef = useRef<{ to: LatLon; at: number } | null>(null);
  const [computed, setComputed] = useState<Computed | null>(null);
  const [error, setError] = useState<string | null>(null);
  const destKey = dest ? `${dest.lat},${dest.lon}` : null;
  const hereLat = here?.lat ?? null;
  const hereLon = here?.lon ?? null;

  // La ruta solo vale para el destino actual.
  const route = computed !== null && computed.key === destKey ? computed.route : null;
  const progress = useMemo(
    () => (route && hereLat !== null && hereLon !== null ? routeProgress(route, { lat: hereLat, lon: hereLon }) : null),
    [route, hereLat, hereLon],
  );
  const offRouteM = progress?.offRouteM ?? 0;

  useEffect(() => {
    if (hereLat === null || hereLon === null || dest === null || destKey === null) return;
    const at = Date.now();
    if (!shouldRefreshRoute(lastRef.current, dest, at, offRouteM)) return;
    lastRef.current = { to: dest, at };
    let active = true;
    getRoute({ lat: hereLat, lon: hereLon }, dest)
      .then((next) => {
        if (!active) return;
        if (next) setComputed({ key: destKey, route: next });
        setError(next ? null : 'No hay ruta en coche hasta ese destino.');
      })
      .catch((err: unknown) => active && setError(errorMessage(err, 'No se ha podido calcular la ruta.')));
    return () => {
      active = false;
    };
    // dest se compara por su clave (lat,lon) para no repetir la petición en cada render;
    // now hace que se compruebe también cada 10 s aunque no os mováis.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hereLat, hereLon, destKey, offRouteM, now]);

  return {
    route,
    remainingM: progress?.remainingM ?? null,
    remainingS: progress?.remainingS ?? null,
    arrival: progress ? arrivalClock(now, progress.remainingS) : null,
    /** Lo que queda de ruta, para el mapa. */
    path: progress?.path ?? route?.path ?? [],
    error: destKey ? error : null,
  };
}
