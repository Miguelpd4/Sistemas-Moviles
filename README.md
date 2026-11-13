# COPI · Toca. Sube. Viaja.

Trabajo de Sistemas Móviles (Universidad de Córdoba). COPI convierte un coche en una sala multijugador efímera: los pasajeros entran tocando una pegatina NFC (o escaneando un QR), comparten música, juegan y al final la app reparte los gastos.

- Contexto y decisiones del proyecto: [CLAUDE.md](CLAUDE.md)
- Planificación Scrum: [docs/planning.md](docs/planning.md) y actas en [docs/sprints/](docs/sprints/)
- Pantallas de referencia: [docs/diseno/](docs/diseno/)

## Stack

React Native con Expo (SDK 58) y expo-router, TypeScript estricto, estilos con `StyleSheet` y los tokens de `src/theme/`, Supabase como backend (Auth anónimo y con email, Postgres con RLS, Realtime, Storage y Edge Functions).

## Puesta en marcha

Requisitos: Node 20 o superior; para Android, Android Studio y un móvil con la depuración USB activada; para Supabase local, Docker.

### 1. Dependencias

```bash
npm install
npx expo install --fix     # ajusta los paquetes nativos a las versiones exactas del SDK 58
cp .env.example .env       # y rellena las variables (paso 3)
```

### 2. Supabase (una persona, una vez)

1. Crea el proyecto en [supabase.com](https://supabase.com) (región de la UE).
2. En *Authentication → Sign In / Providers*: activa **Anonymous sign-ins** y **Email**, y desactiva **Confirm email**.
3. Enlaza el proyecto y aplica las migraciones:

```bash
npx supabase login
npx supabase link --project-ref <ref-del-proyecto>
npx supabase db push
```

4. Edge Functions (búsqueda de Spotify y precio del combustible):

```bash
npx supabase secrets set SPOTIFY_CLIENT_ID=<client id> SPOTIFY_CLIENT_SECRET=<client secret>
npx supabase functions deploy spotify-search
npx supabase functions deploy fuel-price
```

Para trabajar en local (con Docker): `npx supabase start`, `npx supabase db reset` (aplica las migraciones) y `npm run test:db` (pruebas pgTAP de RLS y RPC). Después de cambiar el esquema, regenera los tipos: `npx supabase gen types typescript --local > src/types/database.ts`.

### 3. Variables de entorno

Rellena `.env` (ver comentarios en `.env.example`): URL y clave publicable de Supabase, dominio de Vercel (`EXPO_PUBLIC_WEB_URL`, obligatorio) y el *Client ID* de Spotify.

### 4. Web en Vercel (pasajeros con iPhone)

1. Importa el repositorio en Vercel. `vercel.json` ya indica el comando (`npx expo export --platform web`) y la carpeta (`dist`).
2. Copia las variables `EXPO_PUBLIC_*` del `.env` en *Settings → Environment Variables* de Vercel.
3. El dominio que te dé Vercel es el de `EXPO_PUBLIC_WEB_URL` y el que va en la pegatina. No lo cambiéis después.

### 5. App Android (development build, sin Expo Go)

```bash
npm run android            # compila e instala en el móvil conectado
npm start                  # el resto del tiempo basta con el servidor de desarrollo
```

Hay que recompilar solo al añadir un paquete nativo o cambiar `app.config.ts`.

**App Link (que la pegatina abra la app):**

1. Saca la huella SHA-256 del certificado de depuración:
   `keytool -list -v -keystore android/app/debug.keystore -alias androiddebugkey -storepass android -keypass android`
2. Pégala en `public/.well-known/assetlinks.json` (si alguien del equipo tiene otra distinta, añadid todas a la lista) y vuelve a publicar la web.
3. Comprueba en el móvil: `adb shell pm verify-app-links --re-verify es.uco.copi` y `adb shell pm get-app-links es.uco.copi` (debe salir `verified`).
4. Prueba sin pegatina: `adb shell am start -a android.intent.action.VIEW -d "https://<dominio>/c/DEMO2345"`.

### 6. Pegatina NFC

En la app: *Mi coche* → crea tu cuenta y registra el coche → copia la URL de la tarjeta *Tu pegatina*. Grábala en una NTAG213/215 con la app NFC Tools (*Escribir → Añadir un registro → URL*).

### 7. Spotify (prueba técnica)

En [Spotify for Developers](https://developer.spotify.com/dashboard): crea una app con *Web API*, añade el *Redirect URI* `copi://spotify-auth` y, en *User Management*, el email de la cuenta Premium del conductor. La prueba está en *Perfil → Pruebas técnicas* (solo en desarrollo).

## Scripts

| Comando | Qué hace |
| --- | --- |
| `npm start` | Servidor de desarrollo de Expo |
| `npm run android` | Compila e instala el development build en Android |
| `npm run web` | Abre la versión web |
| `npm run build:web` | Exporta la web estática a `dist/` (Vercel) |
| `npm run typecheck` | Comprueba los tipos con TypeScript |
| `npm run lint` | ESLint con la configuración de Expo |
| `npm test` | Pruebas de la lógica con Jest |
| `npm run test:db` | Pruebas pgTAP de la base de datos (Supabase local) |
| `npm run deps:fix` | Ajusta las versiones de los paquetes al SDK |

## Estructura

```
app/          rutas: (inicio), sala/[sessionId], conductor, resumen/[sessionId], c/[carCode], dev/ (pruebas)
src/          components, hooks, context, services, lib (lógica pura con pruebas), theme, types, config
supabase/     migraciones SQL con RLS, pruebas pgTAP y Edge Functions
public/       archivos que se publican tal cual en la web (.well-known/assetlinks.json)
docs/         planificación, diseño y actas de sprint
```
