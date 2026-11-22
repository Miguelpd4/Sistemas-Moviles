import * as Location from 'expo-location';

import { AppError } from '@/lib/errors';

/** Una posición del GPS de este móvil. */
export type Fix = { lat: number; lon: number; accuracy: number | null };

/**
 * #29 · Sigue la ubicación de este móvil en directo (con la app abierta), como un navegador.
 * Devuelve la función para dejar de seguirla.
 */
export async function watchMyPosition(onFix: (fix: Fix) => void, onError: (message: string) => void): Promise<() => void> {
  const permission = await Location.requestForegroundPermissionsAsync();
  if (!permission.granted) {
    throw new AppError('Sin permiso de ubicación no podemos calcular la ruta desde donde estás. Actívalo en los ajustes.', {
      code: 'LOCATION_DENIED',
    });
  }
  try {
    const subscription = await Location.watchPositionAsync(
      { accuracy: Location.Accuracy.High, timeInterval: 3000, distanceInterval: 10 },
      (position) => onFix({ lat: position.coords.latitude, lon: position.coords.longitude, accuracy: position.coords.accuracy }),
      (reason) => onError(`No se ha podido saber dónde estás: ${reason}`),
    );
    return () => subscription.remove();
  } catch {
    throw new AppError('No se ha podido activar el GPS. Comprueba que la ubicación está encendida.', { code: 'LOCATION_OFF' });
  }
}
