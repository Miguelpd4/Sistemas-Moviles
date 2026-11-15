import { carPaint } from '../theme/tokens';

/** Colores de carrocería que se pueden elegir. La clave se guarda en `cars.color`. */
export type CarColor = keyof typeof carPaint;

export const CAR_COLORS: readonly { value: CarColor; label: string; hex: string }[] = [
  { value: 'blanco', label: 'Blanco', hex: carPaint.blanco },
  { value: 'negro', label: 'Negro', hex: carPaint.negro },
  { value: 'gris', label: 'Gris', hex: carPaint.gris },
  { value: 'plata', label: 'Plata', hex: carPaint.plata },
  { value: 'rojo', label: 'Rojo', hex: carPaint.rojo },
  { value: 'azul', label: 'Azul', hex: carPaint.azul },
  { value: 'verde', label: 'Verde', hex: carPaint.verde },
  { value: 'amarillo', label: 'Amarillo', hex: carPaint.amarillo },
  { value: 'naranja', label: 'Naranja', hex: carPaint.naranja },
  { value: 'marron', label: 'Marrón', hex: carPaint.marron },
  { value: 'beige', label: 'Beige', hex: carPaint.beige },
];

export function isCarColor(value: unknown): value is CarColor {
  return typeof value === 'string' && value in carPaint;
}

/** Hex de la pintura; gris si no hay color guardado. */
export function paintHex(color: string | null | undefined): string {
  return isCarColor(color) ? carPaint[color] : carPaint.gris;
}

/** Colores claros, en los que el detalle del dibujo va en oscuro. */
export function isLightPaint(color: string | null | undefined): boolean {
  return color === 'blanco' || color === 'plata' || color === 'beige' || color === 'amarillo';
}

/** Nombre del color para mostrar («Rojo»), o null si no hay. */
export function colorLabel(color: string | null | undefined): string | null {
  return CAR_COLORS.find((option) => option.value === color)?.label ?? null;
}
