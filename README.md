# COPI · Toca. Sube. Viaja.

Trabajo de Sistemas Móviles (Universidad de Córdoba). COPI convierte un coche en una sala multijugador efímera: los pasajeros entran tocando una pegatina NFC (o escaneando un QR), comparten música, juegan y al final la app reparte los gastos.

- Contexto y decisiones del proyecto: [CLAUDE.md](CLAUDE.md)
- Planificación Scrum: [docs/planning.md](docs/planning.md)
- Pantallas de referencia: [docs/diseno/](docs/diseno/)

## Stack

React Native con Expo (SDK 58) y expo-router, TypeScript estricto, estilos con `StyleSheet` y los tokens de `src/theme/`, Supabase como backend.

## Puesta en marcha

Requisitos: Node 20 o superior y, para Android, Android Studio con un dispositivo o emulador.

```bash
npm install
cp .env.example .env      # rellena las variables
npm run web               # versión web (la de los pasajeros con iPhone)
npm run android           # development build en Android (necesario para NFC, sin Expo Go)
```

## Scripts

| Comando | Qué hace |
| --- | --- |
| `npm start` | Servidor de desarrollo de Expo |
| `npm run android` | Compila e instala el development build en Android |
| `npm run web` | Abre la versión web |
| `npm run build:web` | Exporta la web estática a `dist/` (Vercel) |
| `npm run typecheck` | Comprueba los tipos con TypeScript |
| `npm run lint` | ESLint con la configuración de Expo |
| `npm test` | Pruebas con Jest |

## Estructura

```
app/          rutas de expo-router: (inicio), sala/[sessionId], conductor, resumen/[sessionId], c/[carCode]
src/          components, hooks, context, services, lib (lógica pura con pruebas), theme, types
supabase/     migraciones SQL con RLS y Edge Functions
docs/         requisitos, diseño y actas de sprint
```
