import { useCallback, useEffect, useState } from 'react';

import { totalDistanceM } from '@/lib/distance';
import { AppError, errorMessage } from '@/lib/errors';
import { canFinish, formatFuelPrice, parseFuelPrice } from '@/lib/tripStatus';
import { fetchFuelPrice } from '@/services/location/fuelPrice';
import {
  currentPosition,
  flushTrip,
  isTracking,
  requestTrackingPermissions,
  startTracking,
  stopTracking,
} from '@/services/location/tracking';
import { clearTrip, getActiveTrip, getAllPoints, setActiveTrip } from '@/services/location/tripStorage';
import { endTrip, startTrip } from '@/services/supabase/trip';

import { useSession } from './useSession';

export type TripPhase = 'idle' | 'preparing' | 'price' | 'starting' | 'confirm_finish' | 'finishing';

const PRICE_TIMEOUT_MS = 5000;

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T | null> {
  return Promise.race([promise, new Promise<null>((resolve) => setTimeout(() => resolve(null), ms))]);
}

/**
 * Iniciar y finalizar el viaje (S2-08), solo para el conductor. Iniciar pide los permisos de
 * ubicación, propone el precio del combustible (editable), llama a start_trip y arranca el GPS.
 * Finalizar solo se puede con el coche parado.
 */
export function useTripControls() {
  const { sessionId, session, isHost } = useSession();
  const [phase, setPhase] = useState<TripPhase>('idle');
  const [suggestedPrice, setSuggestedPrice] = useState('');
  const [position, setPosition] = useState<{ lat: number; lon: number } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [needsSettings, setNeedsSettings] = useState(false);
  const status = session?.status;
  const fuelType = session?.fuelType;

  // Si la app (o la página web) se reinicia a mitad de viaje, el GPS vuelve a arrancar.
  useEffect(() => {
    if (!isHost || status !== 'en_curso') return;
    void (async () => {
      try {
        if ((await getActiveTrip()) !== sessionId) await setActiveTrip(sessionId);
        if (!(await isTracking())) await startTracking();
      } catch (err) {
        setError(errorMessage(err, 'No se ha podido volver a arrancar el GPS.'));
      }
    })();
  }, [isHost, status, sessionId]);

  const fail = useCallback((err: unknown, fallback: string) => {
    const code = err instanceof AppError ? err.code : undefined;
    setNeedsSettings(code === 'BACKGROUND_DENIED' || code === 'LOCATION_DENIED');
    setError(errorMessage(err, fallback));
    setPhase('idle');
  }, []);

  /** Paso 1: permisos, posición y precio propuesto. */
  const prepareStart = useCallback(async () => {
    setError(null);
    setNeedsSettings(false);
    setPhase('preparing');
    try {
      await requestTrackingPermissions();
      const here = await currentPosition();
      setPosition(here);
      let price = '';
      if (here && fuelType) {
        const result = await withTimeout(fetchFuelPrice(here.lat, here.lon, fuelType).catch(() => null), PRICE_TIMEOUT_MS);
        if (result) price = formatFuelPrice(result.priceEurL);
      }
      setSuggestedPrice(price);
      setPhase('price');
    } catch (err) {
      fail(err, 'No se ha podido preparar el viaje.');
    }
  }, [fuelType, fail]);

  /** Paso 2: con el precio confirmado, empieza el viaje. */
  const confirmStart = useCallback(
    async (priceText: string) => {
      const price = parseFuelPrice(priceText);
      if (price === null) {
        setError('Escribe el precio en euros por litro, por ejemplo 1,559.');
        return;
      }
      setError(null);
      setPhase('starting');
      try {
        const here = position ?? (await currentPosition());
        await startTrip(sessionId, price, here?.lat ?? 0, here?.lon ?? 0);
        await setActiveTrip(sessionId);
        await startTracking();
        setPhase('idle');
      } catch (err) {
        fail(err, 'No se ha podido iniciar el viaje.');
      }
    },
    [position, sessionId, fail],
  );

  const cancel = useCallback(() => {
    setPhase('idle');
    setError(null);
  }, []);

  /** Finalizar: primero comprueba que el coche está parado. */
  const requestFinish = useCallback(async () => {
    setError(null);
    const points = await getAllPoints(sessionId).catch(() => []);
    const last = points[points.length - 1];
    const lastPoint = last ? { speedMps: last.speed, timestamp: last.timestamp } : null;
    if (!canFinish(lastPoint, Date.now())) {
      setError('Para el coche para finalizar el viaje.');
      return;
    }
    setPhase('confirm_finish');
  }, [sessionId]);

  const confirmFinish = useCallback(async () => {
    setPhase('finishing');
    try {
      await stopTracking().catch(() => undefined);
      await flushTrip(sessionId, true).catch(() => null);
      const points = await getAllPoints(sessionId).catch(() => []);
      const last = points[points.length - 1] ?? null;
      await endTrip(sessionId, totalDistanceM(points), last?.lat ?? null, last?.lon ?? null);
      await clearTrip(sessionId).catch(() => undefined);
      setPhase('idle');
    } catch (err) {
      fail(err, 'No se ha podido finalizar el viaje.');
    }
  }, [sessionId, fail]);

  return { phase, suggestedPrice, error, needsSettings, prepareStart, confirmStart, cancel, requestFinish, confirmFinish };
}
