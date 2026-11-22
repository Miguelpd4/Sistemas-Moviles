import { totalDistanceM } from '@/lib/distance';
import { updateMetrics, uploadPoints } from '@/services/supabase/trip';

import { dropPending, getAllPoints, getLastUpload, getPendingPoints, setLastUpload } from './tripStorage';

/** Los puntos se suben en lotes: 10 puntos o cada 15 s (lo que tarda el coche en moverse en el mapa, #29). */
const BATCH_SIZE = 10;
const BATCH_MS = 15_000;

let flushing = false;

/**
 * Sube los puntos pendientes y actualiza la distancia (S2-08). Si falla, se quedan para la
 * próxima. Lo usan el GPS de Android (tracking.ts) y el de la web (tracking.web.ts).
 */
export async function flushTrip(sessionId: string, force = false): Promise<number | null> {
  if (flushing) return null;
  flushing = true;
  try {
    const pending = await getPendingPoints(sessionId);
    const last = await getLastUpload(sessionId);
    if (!force && pending.length < BATCH_SIZE && Date.now() - last < BATCH_MS) return null;
    if (pending.length > 0) {
      await uploadPoints(sessionId, pending);
      await dropPending(sessionId, pending.length);
    }
    const all = await getAllPoints(sessionId);
    const distance = totalDistanceM(all);
    const lastPoint = all[all.length - 1];
    await updateMetrics(sessionId, distance, lastPoint ? { lat: lastPoint.lat, lon: lastPoint.lon } : null);
    await setLastUpload(sessionId, Date.now());
    return distance;
  } finally {
    flushing = false;
  }
}
