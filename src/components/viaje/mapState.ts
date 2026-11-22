/** Lo que pinta el mapa en vivo (#29). */
export type MapState = {
  car: { lat: number; lon: number } | null;
  dest: { lat: number; lon: number; name: string } | null;
  /** Ruta en [lat, lon]. */
  path: [number, number][];
  /** Seguir al coche al moverse. */
  follow: boolean;
};
