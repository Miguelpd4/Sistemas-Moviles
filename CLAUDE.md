# COPI — Contexto del proyecto para Claude Code

COPI ("Toca. Sube. Viaja.") convierte un coche en una sala multijugador efímera. El conductor crea un viaje; los pasajeros entran tocando una pegatina NFC del coche (o escaneando un QR) sin registrarse. Dentro de la sala comparten música, juegan y, al terminar, la app reparte los gastos del viaje.

Proyecto de la asignatura de Sistemas Móviles (Universidad de Córdoba), grupo de 5 personas, desarrollado con Scrum. **No se publica en tiendas**: se instala en nuestros móviles.

## Decisiones cerradas

- **Plataformas**: app nativa en **Android** (conductor y pasajeros con Android). Los pasajeros con **iPhone** usan la **versión web** de la misma app (Expo web), abierta desde la pegatina.
- **Pegatina NFC**: NTAG21x con una URL `https://<dominio>/c/<codigo_coche>`. El código identifica el coche; la sesión activa se busca en Supabase. La pegatina nunca se reescribe.
  - Android: la URL abre la app (intent filter / App Link).
  - iPhone: el sistema lee la pegatina y abre la web en Safari.
- **Sin Expo Go**: el NFC necesita *development build* (`react-native-nfc-manager` + su config plugin).
- **Música**: la cola vive en Supabase. Solo el conductor se autentica en Spotify (PKCE, Premium) y su móvil reproduce. Los pasajeros buscan a través de una Edge Function. Spotify no permite crear una Jam real por API ni da fragmentos de preview a apps nuevas: "adivina la canción" se hace con *seek* a un segundo aleatorio durante 10 s en el móvil del conductor. Modo desarrollo de Spotify: máximo 5 usuarios autorizados, 10 resultados por búsqueda.
- **Gastos**: botón iniciar/finalizar viaje; distancia GPS × consumo (L/100 km) × precio (€/L), repartido **a partes iguales**, más gastos extra (peajes, parking) con foto del ticket. Pagos: enlace PayPal.me con importe, Bizum (teléfono + importe para copiar) y "marcar como pagado". Sin pasarela real (opcional: Stripe en modo pruebas).
- **Seguridad vial**: el conductor solo ve el Modo conductor (pantalla única, oscura). Todo lo que administra la sala lo hace el **copiloto designado**.

## Stack obligatorio

- React Native con **Expo** (SDK más reciente), **expo-router**.
- **TypeScript estricto**. Nada de `any` salvo justificación en comentario.
- Estilos: **NativeWind** (Tailwind) o `StyleSheet` optimizado.
- Backend: **Supabase** (PostgreSQL + RLS estricto, Auth anónimo para pasajeros y email para conductores, Realtime, Edge Functions, Storage).
- Integraciones: Spotify Web API, `expo-location` + `expo-task-manager` (GPS en segundo plano), `react-native-nfc-manager`, `expo-image-picker`, `expo-speech`, `expo-notifications`, `react-native-maps`.
- Datos abiertos: API REST de carburantes del Ministerio (precios), Wikipedia GeoSearch (trivial), Open-Meteo (tiempo).

## Estructura de carpetas

```
app/                     # rutas de expo-router
  (inicio)/              # barra fuera del viaje: inicio, mi-coche, historial, cuentas, perfil
  sala/[sessionId]/      # barra dentro del viaje: sala, musica, juegos, viaje, pagos
  conductor/             # Modo conductor (pantalla única)
  resumen/[sessionId]    # Resumen final
  c/[carCode]            # destino de la URL de la pegatina
src/
  components/            # UI reutilizable (por módulo: sala/, musica/, juegos/...)
  hooks/                 # hooks personalizados (useSession, useQueue, useTripTracking...)
  context/               # SessionProvider (Realtime de la sala)
  services/supabase/     # cliente, consultas, RPC
  services/spotify/      # llamadas vía Edge Functions
  services/nfc/          # lectura NFC
  lib/                   # utilidades puras (cálculo de gastos, formato)
  types/                 # tipos compartidos y tipos generados de Supabase
supabase/
  migrations/            # SQL con tablas y políticas RLS
  functions/             # Edge Functions
docs/                    # requisitos, diseño, actas de sprint
```

## Navegación

- **Fuera del viaje** (barra inferior): Inicio, Mi coche (solo conductor), Historial, Cuentas, Perfil (recuerdos: historial, estadísticas, muro de fotos de 7 días).
- **Entrada a la sala** (tipo Kahoot): bienvenida "Estás en el coche de X" → nombre y personaje (avatar de la app o foto de galería) → asiento en el dibujo del coche → espera de aprobación si la sala es cerrada.
- **Dentro del viaje** (barra inferior): Sala, Música, Juegos, Viaje, Pagos. Botón fijo "Pedir parada".
- **Modo conductor**: hora de llegada, km y tiempo, pasajeros, QR para unirse, botón "Hablar" (voz), "Finalizar viaje" solo con el coche parado.
- **Resumen**: distancia, pasajeros, CO₂ ahorrado, reparto, estado de pago de cada uno, canción del viaje y ganador de juegos.

## Diseño

- Tema claro: fondo blanco roto, texto casi negro, **naranja** como color principal (botones primarios, pestaña activa), tarjetas con esquinas muy redondeadas.
- Modo conductor: fondo negro, tipografía muy grande, acentos naranja.
- Referencias visuales en `docs/diseno/` (Inicio, Sala, Modo conductor, Resumen).
- Accesibilidad: soportar texto dinámico, etiquetas de accesibilidad y contraste suficiente.

## Base de datos (Supabase)

Tablas: `profiles`, `cars` (con `nfc_code`), `sessions`, `session_members` (rol: conductor/copiloto/pasajero, asiento, avatar), `music_queue`, `queue_votes`, `trip_points`, `trip_metrics`, `game_rounds`, `game_answers`, `polls`, `poll_votes`, `expenses`, `payments`.

Reglas RLS:
- Función `is_member(session_id)`: solo los miembros leen los datos de su sesión.
- Unirse es una RPC `join_session(nfc_code)` *security definer* que comprueba sesión activa y modo de entrada; nunca un `insert` directo.
- Solo el conductor escribe en `sessions`, `trip_points` y `trip_metrics`. Cada usuario escribe solo sus votos y respuestas.
- La clave `service_role` y los secretos de Spotify solo existen en Edge Functions.

Realtime:
- Presence: quién está conectado.
- Broadcast (no se guarda): reacciones, "pedir parada", canción que suena ahora.
- Cambios en BD: miembros, cola y votos, encuestas, rondas de juego, puntos GPS, fin del viaje.

## Reglas de código

- Solo componentes funcionales y hooks. Nada de APIs obsoletas: seguir la documentación actual de Expo y Supabase.
- `try/catch` robusto en NFC, GPS, Spotify y peticiones a Supabase, con mensajes claros al usuario.
- Rendimiento: `useMemo`, `useCallback`, `React.memo`; cada pestaña se suscribe solo a su canal. Los Broadcast no deben re-renderizar toda la sala.
- La lógica de cálculo (reparto, distancia) va en `src/lib/` como funciones puras con pruebas en Jest.
- Toda tabla nueva lleva su migración y su política RLS en `supabase/migrations/`.
- Textos de la interfaz en español.

## Forma de trabajar (Scrum)

- Cada tarea es una issue de GitHub con etiqueta de módulo y el sprint como *milestone*.
- Una rama por issue (`feat/<n>-<nombre>`, `fix/<n>-<nombre>`), PR con `Closes #<n>` y revisión de otra persona.
- Commits: `tipo(modulo): descripción en español`, por ejemplo `feat(musica): votos para saltar canción`.
- **Paso a paso**: no generar el proyecto entero de golpe. Trabajar una issue cada vez, desde la migración y la política RLS hasta el componente de UI.
- Definición de hecho: funciona en Android real (y en web si aplica), maneja errores, tiene prueba de la lógica, RLS en tablas nuevas, PR revisada.

## Sprints

| Sprint | Fechas | Objetivo |
| --- | --- | --- |
| 0 | 10–15 nov | Repo, Expo, Supabase, prueba de NFC y web en Vercel |
| 1 | 16–22 nov | Entrada por pegatina, lobby tipo Kahoot, sala en vivo, Modo conductor (demo NFC) |
| 2 | 23–29 nov | Música: cola, votos, turnos de DJ, adivina la canción, ¿quién la ha puesto? |
| 3 | 30 nov–6 dic | GPS, reparto, gastos extra, pagos, mapa en vivo (MVP completo) |
| 4 | 7–13 dic | Juegos, ranking, recuerdos en el perfil, notificaciones, pruebas |

Sprints de una semana (lunes a domingo). Si algo se retrasa se recorta el Sprint 4, nunca el MVP.

## Comandos habituales

```
npx expo start                     # servidor de desarrollo
npx expo run:android               # development build local en Android
npx expo start --web               # versión web
npx supabase start                 # Supabase local (Docker)
npx supabase db push               # aplicar migraciones al proyecto remoto
npx supabase functions deploy <f>  # desplegar una Edge Function
npm test                           # pruebas con Jest
```
