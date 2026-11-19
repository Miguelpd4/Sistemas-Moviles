import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { useColorScheme, type ImageStyle, type TextStyle, type ViewStyle } from 'react-native';

import { darkColors, elevationFor, lightColors, type Palette } from './tokens';

/** Lo que elige el usuario en Perfil → Apariencia. */
export type ThemePreference = 'oscuro' | 'claro' | 'sistema';
export type ThemeScheme = 'dark' | 'light';

type ThemeValue = {
  colors: Palette;
  scheme: ThemeScheme;
  preference: ThemePreference;
  setPreference: (preference: ThemePreference) => void;
  elevation: ReturnType<typeof elevationFor>;
};

const STORAGE_KEY = 'copi.apariencia';
const DEFAULT_PREFERENCE: ThemePreference = 'oscuro';

const darkValue: ThemeValue = {
  colors: darkColors,
  scheme: 'dark',
  preference: DEFAULT_PREFERENCE,
  setPreference: () => undefined,
  elevation: elevationFor(darkColors),
};

// Sin proveedor (por ejemplo en las pruebas) se usa el tema oscuro.
const ThemeContext = createContext<ThemeValue>(darkValue);

function isPreference(value: unknown): value is ThemePreference {
  return value === 'oscuro' || value === 'claro' || value === 'sistema';
}

/** Tema de la app: oscuro por defecto, claro o el del sistema. La elección se guarda en el móvil. */
export function ThemeProvider({ children }: { children: ReactNode }) {
  const system = useColorScheme();
  const [preference, setPreferenceState] = useState<ThemePreference>(DEFAULT_PREFERENCE);

  useEffect(() => {
    let active = true;
    AsyncStorage.getItem(STORAGE_KEY)
      .then((stored) => {
        if (active && isPreference(stored)) setPreferenceState(stored);
      })
      .catch(() => undefined);
    return () => {
      active = false;
    };
  }, []);

  const setPreference = useCallback((next: ThemePreference) => {
    setPreferenceState(next);
    AsyncStorage.setItem(STORAGE_KEY, next).catch(() => undefined);
  }, []);

  const scheme: ThemeScheme =
    preference === 'sistema' ? (system === 'light' ? 'light' : 'dark') : preference === 'claro' ? 'light' : 'dark';

  const value = useMemo<ThemeValue>(() => {
    const colors = scheme === 'dark' ? darkColors : lightColors;
    return { colors, scheme, preference, setPreference, elevation: elevationFor(colors) };
  }, [scheme, preference, setPreference]);

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme(): ThemeValue {
  return useContext(ThemeContext);
}

/** Lo que devuelve `StyleSheet.create` (React Native 0.88 ya no exporta `StyleSheet.NamedStyles`). */
type NamedStyles = Readonly<Record<string, ViewStyle | TextStyle | ImageStyle>>;

/**
 * Estilos que dependen del tema. Se declaran fuera del componente:
 *   const makeStyles = (c: Palette) => StyleSheet.create({ ... });
 * y dentro: const styles = useStyles(makeStyles);
 */
export function useStyles<T extends NamedStyles>(factory: (colors: Palette) => T): T {
  const { colors } = useTheme();
  return useMemo(() => factory(colors), [factory, colors]);
}

/** Fuerza el tema oscuro en una parte de la app (el Modo conductor siempre es oscuro). */
export function ForceDarkTheme({ children }: { children: ReactNode }) {
  const parent = useTheme();
  const value = useMemo<ThemeValue>(
    () => ({ ...parent, colors: darkColors, scheme: 'dark', elevation: elevationFor(darkColors) }),
    [parent],
  );
  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}
