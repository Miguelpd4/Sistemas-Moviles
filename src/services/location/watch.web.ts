/** Una posición del GPS de este móvil. */
export type Fix = { lat: number; lon: number; accuracy: number | null };

/** #29 · En la web la ubicación la da el navegador (pide permiso la primera vez; necesita https). */
export async function watchMyPosition(onFix: (fix: Fix) => void, onError: (message: string) => void): Promise<() => void> {
  if (typeof navigator === 'undefined' || !navigator.geolocation) {
    onError('Este navegador no puede darnos tu ubicación.');
    return () => undefined;
  }
  const id = navigator.geolocation.watchPosition(
    (position) => onFix({ lat: position.coords.latitude, lon: position.coords.longitude, accuracy: position.coords.accuracy }),
    (error) =>
      onError(
        error.code === error.PERMISSION_DENIED
          ? 'Sin permiso de ubicación no podemos calcular la ruta desde donde estás. Permítela en el navegador (el candado junto a la dirección).'
          : 'No se ha podido saber dónde estás. Comprueba que la ubicación del móvil está encendida.',
      ),
    { enableHighAccuracy: true, maximumAge: 5000, timeout: 30_000 },
  );
  return () => navigator.geolocation.clearWatch(id);
}
