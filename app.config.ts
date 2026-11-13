import type { ConfigContext, ExpoConfig } from 'expo/config';

/**
 * Configuración de Expo (sustituye a app.json). Es un .ts para poder leer el dominio de la web
 * desde .env: con él se registra el App Link que hace que la pegatina abra la app en Android.
 * Expo carga .env antes de leer este archivo.
 */
// En las pruebas (Jest) no hace falta .env: se usa un dominio de ejemplo.
const webUrl =
  process.env.EXPO_PUBLIC_WEB_URL?.trim() || (process.env.NODE_ENV === 'test' ? 'https://copi.example' : undefined);
if (!webUrl) {
  throw new Error(
    'Falta EXPO_PUBLIC_WEB_URL en .env (por ejemplo https://copi-uco.vercel.app). Copia .env.example a .env y rellénalo.',
  );
}
const webHost = /^https:\/\/([^/?#:]+)/i.exec(webUrl)?.[1]?.toLowerCase();
if (!webHost) {
  throw new Error(`EXPO_PUBLIC_WEB_URL debe empezar por https:// (ahora vale "${webUrl}").`);
}

export default ({ config }: ConfigContext): ExpoConfig => ({
  ...config,
  name: 'COPI',
  slug: 'copi',
  version: '1.0.0',
  orientation: 'portrait',
  icon: './assets/images/icon.png',
  // copi:// lo usa Spotify para volver a la app (copi://spotify-auth)
  scheme: 'copi',
  userInterfaceStyle: 'light',
  android: {
    package: 'es.uco.copi',
    adaptiveIcon: {
      backgroundColor: '#F6F4F0',
      foregroundImage: './assets/images/android-icon-foreground.png',
      backgroundImage: './assets/images/android-icon-background.png',
      monochromeImage: './assets/images/android-icon-monochrome.png',
    },
    predictiveBackGestureEnabled: false,
    // App Link: https://<dominio>/c/<codigo> abre la app directamente (verificado con assetlinks.json)
    intentFilters: [
      {
        action: 'VIEW',
        autoVerify: true,
        data: [{ scheme: 'https', host: webHost, pathPrefix: '/c/' }],
        category: ['BROWSABLE', 'DEFAULT'],
      },
    ],
  },
  web: {
    output: 'single',
    bundler: 'metro',
    favicon: './assets/images/favicon.png',
  },
  plugins: [
    'expo-router',
    [
      'expo-splash-screen',
      {
        backgroundColor: '#F6F4F0',
        image: './assets/images/splash-icon.png',
        imageWidth: 76,
      },
    ],
    'react-native-nfc-manager',
    'expo-secure-store',
    [
      'expo-image-picker',
      {
        photosPermission: 'COPI usa tus fotos para tu personaje y la foto de tu coche.',
        cameraPermission: 'COPI usa la cámara para la foto de tu personaje y de tu coche.',
      },
    ],
    [
      'expo-location',
      {
        locationAlwaysAndWhenInUsePermission:
          'COPI usa tu ubicación durante el viaje para medir la distancia y repartir los gastos.',
        locationWhenInUsePermission: 'COPI usa tu ubicación para medir la distancia del viaje.',
        isAndroidBackgroundLocationEnabled: true,
        isAndroidForegroundServiceEnabled: true,
      },
    ],
  ],
  experiments: {
    typedRoutes: true,
    reactCompiler: true,
  },
});
