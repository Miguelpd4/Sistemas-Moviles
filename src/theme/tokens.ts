/**
 * Tokens de diseño de COPI (ver docs/diseno/).
 *
 * Contraste comprobado con WCAG 2.1:
 * - `primary` con texto blanco en negrita ≥ 18 px: 3,7:1 (válido para texto grande).
 * - `primaryText` sobre `background`: 4,7:1 (válido para texto normal).
 * - `driver.accent` sobre `driver.background`: 6,7:1.
 */

export const colors = {
  /** Fondo blanco roto de toda la app. */
  background: '#F6F4F0',
  /** Tarjetas y superficies elevadas. */
  surface: '#EEECE8',
  surfaceStrong: '#E4E1DC',
  /** Tarjeta oscura ("Crear viaje"). */
  inverse: '#161616',
  text: '#141414',
  textSecondary: '#5F5F5F',
  textOnPrimary: '#FFFFFF',
  textOnInverse: '#FFFFFF',
  /** Naranja principal: botones primarios y pestaña activa. */
  primary: '#E8540A',
  /** Naranja para texto sobre fondo claro (más oscuro por contraste). */
  primaryText: '#C2410C',
  primarySoft: '#FDE3D3',
  success: '#2F8F5B',
  successSoft: '#DDF1E5',
  danger: '#C62828',
  border: '#DEDAD4',
} as const;

/** Modo conductor: fondo negro, tipografía muy grande, acentos naranja. */
export const driverColors = {
  background: '#0E0E0E',
  surface: '#1E1E1E',
  text: '#FFFFFF',
  textSecondary: '#B5B5B5',
  accent: '#FF6A1A',
} as const;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
} as const;

export const radius = {
  sm: 12,
  md: 20,
  /** Tarjetas con esquinas muy redondeadas. */
  lg: 28,
  pill: 999,
} as const;

export const typography = {
  display: { fontSize: 40, lineHeight: 46, fontWeight: '800' },
  title: { fontSize: 28, lineHeight: 34, fontWeight: '700' },
  heading: { fontSize: 20, lineHeight: 26, fontWeight: '700' },
  body: { fontSize: 16, lineHeight: 22, fontWeight: '400' },
  bodyStrong: { fontSize: 16, lineHeight: 22, fontWeight: '600' },
  caption: { fontSize: 13, lineHeight: 18, fontWeight: '500' },
} as const;

export type TypographyVariant = keyof typeof typography;
