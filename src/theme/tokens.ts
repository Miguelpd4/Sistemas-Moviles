/**
 * Tokens de diseño de COPI.
 *
 * Estilo «Noche»: la app es oscura por defecto, como el salpicadero de un coche de noche, con el
 * naranja como único color de acción y el coche (foto o silueta) como protagonista. Hay un modo
 * claro con los mismos nombres de color, que se elige en Perfil → Apariencia.
 *
 * Contraste (WCAG 2.1):
 * - Oscuro: `text` sobre `background` 17:1; `textSecondary` 7,6:1; `primaryText` 6,9:1.
 * - Claro: `text` sobre `background` 17:1; `textSecondary` 6,0:1; `primaryText` 4,7:1.
 * - Texto blanco sobre `primary` solo en negrita y ≥ 17 px (texto grande).
 */

export type Palette = {
  background: string;
  /** Tarjetas sobre el fondo. */
  surface: string;
  /** Lo principal de cada pantalla (el coche, el formulario). */
  surfaceRaised: string;
  surfaceStrong: string;
  /** Tarjeta en el color contrario al tema. */
  inverse: string;
  inverseSoft: string;
  text: string;
  textSecondary: string;
  textTertiary: string;
  textOnPrimary: string;
  textOnInverse: string;
  primary: string;
  primaryPressed: string;
  /** Naranja para texto sobre el fondo. */
  primaryText: string;
  primarySoft: string;
  /** Resplandor detrás del coche. */
  glow: string;
  success: string;
  successSoft: string;
  danger: string;
  dangerSoft: string;
  border: string;
  borderStrong: string;
  overlay: string;
  shadow: string;
  /** El QR siempre negro sobre blanco para que lo lea cualquier cámara. */
  qrDark: string;
  qrLight: string;
  /** Interior del coche visto desde arriba (plano de asientos). */
  cabin: string;
};

export const darkColors: Palette = {
  background: '#0E0F11',
  surface: '#17181B',
  surfaceRaised: '#1C1E22',
  surfaceStrong: '#26282D',
  inverse: '#F5F4F2',
  inverseSoft: '#E4E2DE',
  text: '#F5F4F2',
  textSecondary: '#A3A6AD',
  textTertiary: '#6F737A',
  textOnPrimary: '#FFFFFF',
  textOnInverse: '#0E0F11',
  primary: '#FF6A1A',
  primaryPressed: '#E2560A',
  primaryText: '#FF8A4C',
  primarySoft: '#33190C',
  glow: '#5C2409',
  success: '#3FD18A',
  successSoft: '#12301F',
  danger: '#FF6B63',
  dangerSoft: '#3A1513',
  border: '#2A2C31',
  borderStrong: '#3B3E45',
  overlay: 'rgba(0, 0, 0, 0.65)',
  shadow: '#000000',
  qrDark: '#000000',
  qrLight: '#FFFFFF',
  cabin: '#101113',
};

export const lightColors: Palette = {
  background: '#F4F2EE',
  surface: '#FFFFFF',
  surfaceRaised: '#FFFFFF',
  surfaceStrong: '#EAE7E2',
  inverse: '#141414',
  inverseSoft: '#2A2A2A',
  text: '#141414',
  textSecondary: '#5E5B57',
  textTertiary: '#8C8882',
  textOnPrimary: '#FFFFFF',
  textOnInverse: '#FFFFFF',
  primary: '#E8540A',
  primaryPressed: '#C94607',
  primaryText: '#C2410C',
  primarySoft: '#FDE5D6',
  glow: '#FFD9C2',
  success: '#2F8F5B',
  successSoft: '#DDF1E5',
  danger: '#C62828',
  dangerSoft: '#FBE4E4',
  border: '#E3DFD9',
  borderStrong: '#CFCAC2',
  overlay: 'rgba(0, 0, 0, 0.4)',
  shadow: '#2B2118',
  qrDark: '#000000',
  qrLight: '#FFFFFF',
  cabin: '#EAE7E2',
};

/** Matrícula europea (banda azul con la E de España, fondo blanco y letras negras). */
export const plate = {
  band: '#0A3BA8',
  bandText: '#FFFFFF',
  stars: '#F7C600',
  background: '#FFFFFF',
  text: '#111111',
  border: '#1A1A1A',
} as const;

/** Colores de carrocería (src/lib/carColors.ts). */
export const carPaint = {
  blanco: '#F3F3F1',
  negro: '#1E1F21',
  gris: '#7D8186',
  plata: '#C3C6CA',
  rojo: '#B3261E',
  azul: '#1F4E9C',
  verde: '#2E6B45',
  amarillo: '#E7B416',
  naranja: '#E8540A',
  marron: '#6B4A33',
  beige: '#D8C8A6',
} as const;

/** Detalles de la silueta del coche (src/components/coche/CarSilhouette.tsx). */
export const carDrawing = {
  glassOnDark: '#D8E3EE',
  glassOnLight: '#3B4250',
  trimOnDark: '#FFFFFF',
  trimOnLight: '#9AA0A8',
  tyre: '#1B1B1D',
  hub: '#B9BEC5',
  headlight: '#F7D774',
  taillight: '#D9443A',
  outline: '#9AA0A8',
  groundShadow: '#000000',
} as const;

/** Modo conductor: siempre oscuro, tipografía muy grande, acentos naranja. */
export const driverColors = {
  background: '#000000',
  surface: '#16171A',
  surfaceStrong: '#24262A',
  text: '#FFFFFF',
  textSecondary: '#B5B7BC',
  accent: '#FF6A1A',
} as const;

/**
 * Fondos de los 12 personajes predefinidos (src/lib/avatars.ts).
 * Todos tienen contraste de al menos 3:1 con el icono blanco.
 */
export const avatarPalette = [
  '#E8540A',
  '#7C3AED',
  '#2563EB',
  '#0F766E',
  '#15803D',
  '#B45309',
  '#BE185D',
  '#1D4ED8',
  '#C2410C',
  '#4338CA',
  '#047857',
  '#9D174D',
] as const;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
} as const;

export const radius = {
  xs: 8,
  sm: 14,
  md: 20,
  /** Tarjetas con esquinas muy redondeadas. */
  lg: 28,
  pill: 999,
} as const;

/** Archivos de assets/fonts (Inter, licencia OFL). Se cargan en app/_layout.tsx. */
export const fonts = {
  regular: 'Inter-Regular',
  medium: 'Inter-Medium',
  semibold: 'Inter-SemiBold',
  bold: 'Inter-Bold',
  displayBold: 'InterDisplay-Bold',
  display: 'InterDisplay-ExtraBold',
  black: 'InterDisplay-Black',
} as const;

/**
 * Escala tipográfica. Con fuentes propias, el grosor lo da la familia (Android no elige el
 * archivo por `fontWeight`), así que aquí no se usa `fontWeight`.
 */
export const typography = {
  /** Números y titulares enormes: la hora, el total, el saludo. */
  hero: { fontFamily: fonts.black, fontSize: 48, lineHeight: 50, letterSpacing: -1.8 },
  /** Titular de cada pantalla. */
  display: { fontFamily: fonts.display, fontSize: 34, lineHeight: 38, letterSpacing: -1.1 },
  title: { fontFamily: fonts.display, fontSize: 26, lineHeight: 30, letterSpacing: -0.7 },
  heading: { fontFamily: fonts.bold, fontSize: 18, lineHeight: 23, letterSpacing: -0.3 },
  body: { fontFamily: fonts.regular, fontSize: 16, lineHeight: 23, letterSpacing: -0.1 },
  bodyStrong: { fontFamily: fonts.semibold, fontSize: 16, lineHeight: 23, letterSpacing: -0.1 },
  label: { fontFamily: fonts.semibold, fontSize: 14, lineHeight: 19, letterSpacing: 0 },
  caption: { fontFamily: fonts.medium, fontSize: 13, lineHeight: 18, letterSpacing: 0 },
  /** Letras de la matrícula. */
  plate: { fontFamily: fonts.black, fontSize: 22, lineHeight: 26, letterSpacing: 2 },
} as const;

export type TypographyVariant = keyof typeof typography;

/** Sombra para lo elevado. En oscuro apenas se ve; el relieve lo dan el borde y el resplandor. */
export function elevationFor(palette: Palette) {
  return {
    shadowColor: palette.shadow,
    shadowOpacity: palette === darkColors ? 0.5 : 0.1,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 10 },
    elevation: palette === darkColors ? 0 : 5,
  } as const;
}
