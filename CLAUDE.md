# COPI — Contexto del proyecto para Claude Code

COPI ("Toca. Sube. Viaja.") convierte un coche en una sala multijugador efímera. El conductor crea un viaje; los pasajeros entran tocando una pegatina NFC del coche (o escaneando un QR) sin registrarse. Dentro de la sala comparten música, juegan y, al terminar, la app reparte los gastos del viaje.

Proyecto de la asignatura de Sistemas Móviles (Universidad de Córdoba), grupo de 5 personas, desarrollado con Scrum. **No se publica en tiendas**: se instala en nuestros móviles.

## Decisiones cerradas

- **Plataformas**: app nativa en **Android** (conductor y pasajeros con Android). Los pasajeros con **iPhone** usan la **versión web** de la misma app (Expo web), abierta desde la pegatina.
- **Pegatina NFC**: NTAG21x con una URL `https://<dominio>/c/<codigo_coche>`. El código identifica el coche; la sesión activa se busca en Supabase. La pegatina nunca se reescribe.
  - Android: la URL abre la app (intent filter / App Link).
  - iPhone: el sistema lee la pegatina y abre la web en Safari.
- **Sin Expo Go**: el NFC necesita *development build* (`react-native-nfc-manager` + su config plugin).
- **Música** (#57): la cola vive en Supabase y suena con **YouTube dentro de COPI**, en el reproductor del Modo conductor (API IFrame: en un WebView en Android, directa en la web). **Nadie inicia sesión**: la búsqueda va por la Edge Function `youtube-search` con la clave de COPI (secreto `YOUTUBE_API_KEY`), unas 100 búsquedas nuevas al día gratis (las repetidas en 6 h no gastan). YouTube exige que el vídeo se vea y no deja sonar en segundo plano. «Adivina la canción» pone 10 s de otra canción del viaje desde un segundo al azar en ese mismo reproductor y luego vuelve a la de la cola. Spotify se descartó (Premium, app de Spotify abierta, máximo 5 cuentas); las canciones de Spotify que quedaron de las pruebas tienen `source = 'spotify'` y no se ponen.
- **Gastos**: botón iniciar/finalizar viaje; distancia GPS × consumo (L/100 km) × precio (€/L), repartido **a partes iguales entre todos los ocupantes, conductor incluido** (el conductor también paga su parte), más gastos extra (peajes, parking) con foto del ticket. Pagos: enlace PayPal.me con importe, Bizum (teléfono + importe para copiar) y "marcar como pagado". Sin pasarela real (opcional: Stripe en modo pruebas).
- **Seguridad vial**: el conductor solo ve el Modo conductor (pantalla única, oscura). Todo lo que administra la sala lo hace el **copiloto designado**.

## Stack obligatorio

- React Native con **Expo** (SDK más reciente), **expo-router**.
- **TypeScript estricto**. Nada de `any` salvo justificación en comentario.
- Estilos: `StyleSheet` de React Native con los tokens de `src/theme/` (colores, espaciado, radios, tipografía). Sin NativeWind.
- Backend: **Supabase** (PostgreSQL + RLS estricto, Auth anónimo para pasajeros y email para conductores, Realtime, Edge Functions, Storage).
- Integraciones: YouTube Data API v3 (búsqueda) y API IFrame de YouTube (reproductor, con `react-native-webview`), `expo-location` + `expo-task-manager` (GPS en segundo plano), `react-native-nfc-manager`, `expo-image-picker`, `expo-speech`, `expo-notifications`, `pg_cron` y `pg_net` (borrado de recuerdos). Mapa con Leaflet y OpenStreetMap en un WebView (directo en la web), rutas con OSRM y búsqueda de lugares con Nominatim (sin claves).
- Datos abiertos: API REST de carburantes del Ministerio (precios), Wikipedia GeoSearch (trivial), Open-Meteo (tiempo).

## Configuración

- `app.config.ts` (no `app.json`): lee `EXPO_PUBLIC_WEB_URL` para registrar el App Link `https://<dominio>/c/...`.
- Variables públicas en `src/config/env.ts`; nunca leer `process.env` en otros sitios.
- Lo que solo existe en Android tiene una versión `.web.ts` o `.web.tsx` (NFC, GPS, reproductor de YouTube). El GPS del viaje también funciona en la web (`tracking.web.ts`, ubicación del navegador con la página abierta); la subida de puntos es común (`tripFlush.ts`).

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
  services/youtube/      # búsqueda (Edge Function) y página del reproductor
  services/nfc/          # lectura NFC
  lib/                   # utilidades puras (cálculo de gastos, formato)
  theme/                 # tokens de diseño (colores, espaciado, radios, tipografía)
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

- Estilo «Noche»: **tema oscuro por defecto** y claro o del sistema en Perfil → Apariencia (`src/theme/ThemeProvider.tsx`). Naranja como único color de acción.
- Colores siempre desde el tema: `useTheme()` para valores sueltos y `useStyles(makeStyles)` para estilos que dependen del tema. Nunca colores fijos en los componentes.
- Fuente Inter incluida en `assets/fonts` (títulos con Inter Display). Con fuentes propias el grosor lo da `fontFamily` (tokens `fonts` y `typography`), no `fontWeight`.
- El coche es el protagonista: foto propia > foto del modelo (Wikipedia) > silueta de su color, y el código del coche se muestra como matrícula europea (`src/components/coche/`).
- Modo conductor: siempre oscuro (`ForceDarkTheme`), tipografía muy grande, acentos naranja.
- Sistema de diseño (`src/theme/tokens.ts`, `src/components/ui/`): el naranja (`primary`) es solo para acciones; los acentos secundarios (`colors.accents`: azul, violeta, turquesa, rosa, ámbar, verde) dan identidad a juegos, estadísticas y accesos, y `info`/`warning` a los avisos. Tipografía `stat` para cifras y `overline` para antetítulos; margen lateral `spacing.gutter`. Piezas comunes: `PressableScale` (encoge al pulsar, respeta reducir movimiento, vibración ligera), `Button` (píldora), `IconTile`, `StatTile` (rejillas de dos columnas), `SectionHeader`, `Skeleton`/`SkeletonCards` (cargas), `Notice` con `action` (Reintentar), `EmptyState` con `tint`, `LiveDot`, `BrandMark` y `Appear` (entrada suave). Cada juego tiene su color en `src/games/registry.ts` (`tint`).
- Accesibilidad: soportar texto dinámico, etiquetas de accesibilidad y contraste suficiente.

## Base de datos (Supabase)

Tablas: `profiles`, `cars` (con `nfc_code`), `sessions`, `session_members` (rol: conductor/copiloto/pasajero, asiento, avatar), `music_queue`, `queue_votes`, `trip_points`, `trip_metrics`, `fuel_price_cache`, `game_rounds`, `game_round_secrets`, `game_answers`, `expenses`, `payments`, `memories`. La especificación completa de cada sprint (SQL incluido) está en `docs/sprints/`.

Reglas RLS:
- Función `is_member(session_id)`: solo los miembros leen los datos de su sesión.
- Unirse es una RPC `join_session(nfc_code, ...)` *security definer* que comprueba sesión activa y modo de entrada; nunca un `insert` directo. Funciones auxiliares de las políticas: `is_member`, `is_admin`, `is_host`, `shares_session`.
- Solo el conductor escribe en `sessions`, `trip_points` y `trip_metrics`. Cada usuario escribe solo sus votos y respuestas.
- La clave `service_role` y la clave de YouTube solo existen en Edge Functions.

Realtime:
- Un solo canal privado por sala y móvil, `sala:<session_id>` (`src/services/supabase/roomChannel.ts`), compartido por la Sala y el Modo conductor. Lo reparte `SessionProvider`; los componentes escuchan con `useSession().on(...)` o `useBroadcast(...)`. No crear canales sueltos con `supabase.channel()` en las pantallas.
- Solo entran los miembros que están dentro (políticas de `realtime.messages`). Quien espera aprobación usa su canal privado `entrada:<session_id>:<user_id>:…`.
- Presence: quién está conectado.
- Broadcast (no se guarda): reacciones, "pedir parada", canción que suena ahora, órdenes de música del copiloto (`control_musica`).
- Cambios en BD: miembros, cola y votos, encuestas, rondas de juego, puntos GPS, fin del viaje.

## Reglas de código

- Solo componentes funcionales y hooks. Nada de APIs obsoletas: seguir la documentación actual de Expo y Supabase.
- `try/catch` robusto en NFC, GPS, YouTube y peticiones a Supabase, con mensajes claros al usuario.
- Rendimiento: `useMemo`, `useCallback`, `React.memo`; cada pestaña se suscribe solo a su canal. Los Broadcast no deben re-renderizar toda la sala.
- La lógica de cálculo (reparto, distancia) va en `src/lib/` como funciones puras con pruebas en Jest.
- Toda tabla nueva lleva su migración y su política RLS en `supabase/migrations/`.
- Textos de la interfaz en español.

## Forma de trabajar (Scrum)

- Cada tarea es una issue de GitHub con etiqueta de módulo y el sprint como *milestone*.
- Una rama por issue (`feat/<n>-<nombre>`, `fix/<n>-<nombre>`), PR con `Closes #<n>` y revisión de otra persona.
- **Norma del equipo** (GitHub no puede forzarla: el repo es privado en una cuenta gratuita): nunca se hace push directo a `main` ni se fusiona una PR propia sin la aprobación de otra persona.
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

## Estado actual

- Sprint 1 y Sprint 2 hechos en código y en `main`, incluidos los juegos musicales (#20 turnos de DJ, #21 «Adivina la canción», #22 «¿Quién la ha puesto?»). El detalle, lo que falta probar y la lista de la demo están en `docs/sprints/sprint-1.md` y `docs/sprints/sprint-2.md`. El plan completo de los 4 sprints está en el documento compartido del equipo.
- Supabase (proyecto `dytieuiyvrsejwvcvirh`) tiene aplicadas todas las migraciones de `supabase/migrations/` (la última, `20261125154541_ranking.sql`) y desplegadas las funciones `fuel-price`, `youtube-search` y `purge-memories`. `spotify-search` sigue desplegada pero ya no se usa: se puede borrar en Supabase, junto con los secretos `SPOTIFY_CLIENT_ID` y `SPOTIFY_CLIENT_SECRET`.
- Una migración aplicada con el conector de Supabase queda registrada con la hora de aplicación: renombrar el fichero a esa versión para que `supabase db push` no la repita.
- `npm run typecheck`, `npm run lint` y `npm test` pasan sin errores; mantenedlos así antes de abrir cada PR. Las plantillas de issue (historia y fallo) y de PR están en `.github/`.
- Música con YouTube: prueba técnica en #54 (Perfil → Prueba de YouTube) y la sala entera en #57: cola, Música, turnos de DJ, Modo conductor (`MusicPlayer`, `useYouTubeController`, `useHostPlayer`) y «Adivina la canción» (`useSongQuizHost`). El conductor y el copiloto controlan la música desde Música (#60): ⏮ y ⏸/▶ con el aviso `control_musica` y ⏭ con la RPC `skip_song`. Solo suena un Modo conductor a la vez (`usePlayerOwnership`). Configuración en `docs/youtube-google-cloud.md`.
- Reparto (#25): al finalizar, `end_trip` llama a `settle_trip`, que apunta la gasolina como gasto del conductor (tabla `expenses`) y crea los pagos entre ocupantes (tabla `payments`) con el mismo algoritmo que `src/lib/split.ts` y `src/lib/settle.ts`. Se ve en Pagos y en el Resumen (`SettlementCard`, `tripMoney`). Pagar (#27): en cada pago pendiente, quien paga tiene «Pagar con PayPal» (PayPal.me con el importe), «Bizum» (copia teléfono e importe) y «Ya he pagado»; quien cobra, «Ya me ha pagado» (RPC `mark_payment_paid`). Los datos salen del Perfil de quien cobra. Gastos extra (#26): durante el viaje, en Pagos, cualquiera añade peajes, parking u otros que ha pagado con la foto del ticket (cubo privado `tickets/<viaje>/<usuario>/…`, `AddExpenseSheet`, `ExpenseList`); entran en el reparto al finalizar. Cuentas (#28): en Inicio → Cuentas, lo que debes y lo que te deben de todos los viajes, con los mismos botones de pago, y lo último ya saldado (`useAccounts`, `summarizeAccounts`). Pagos queda completo.
- Mapa en vivo (#29): el conductor o el copiloto ponen el destino en Viaje (RPC `set_destination`, búsqueda con Nominatim); el mapa (`LiveMap`, Leaflet + OSM) funciona como un navegador: sale desde la ubicación en directo del móvil (`useMyLocation`, `watch.ts`/`watch.web.ts`; si no la da, la última del coche), enseña la ruta de OSRM que queda y el tiempo, los km y la hora de llegada bajan al avanzar (`routeProgress`); si os salís, se pide otra ruta. Sale en Viaje y en el Modo conductor (`useTripRoute`, `DriverEta`). La posición del coche se sube cada 15 s.
- Juegos del camino (#48): «Trivial del camino» (`trivial`): quien empieza la ronda busca en Wikipedia GeoSearch los sitios a menos de 10 km (`fetchNearbyPlaces`) y prepara la pregunta en su móvil (`buildTrivia`: «¿Qué sitio es?» con el nombre tapado o «¿Cuál está más cerca?»); la respuesta va a `game_round_secrets` y `reveal_round` da 100 puntos. «Cazamatrículas» (`matriculas`): un reto sobre las matrículas actuales (1234 BCD) y 3 minutos; cada pasajero escribe la que ha visto con la RPC `submit_plate`, que comprueba el reto (`plate_matches`, igual que `src/lib/games/matriculas.ts`) y da 100/75/50/25/10 puntos por orden de llegada. «Bingo de carretera» (`bingo`): quien empieza reparte un cartón de 3×3 distinto a cada pasajero (`makeCards`, en el payload); cada uno marca lo que ve con la RPC `bingo_mark` (las marcas no se quitan), que da 30/20/10 puntos a la primera línea de cada uno según el orden y 100 al primer cartón completo, que termina la ronda (`BingoCard`).
- Recuerdos (#34): Inicio → Historial lista mis viajes terminados que llegaron a salir, por meses, con el coche, quién conducía, destino, km, tiempo, CO₂ ahorrado, mi parte y lo pendiente; arriba los totales. Cada viaje abre su Resumen (`useHistory`, `getHistory`, `buildHistory` en `src/lib/history.ts`, `TripCard`). En Perfil, «Tus estadísticas» (`buildStats`, `StatsCard`: papeles, coche y viaje favoritos, juegos y música) y «Tus recuerdos». Muro de fotos del viaje (`MemoryWall`, en Viaje y en el Resumen): tabla `memories` y cubo privado `recuerdos/<viaje>/<usuario>/…`; solo lo ven los del coche y hasta 7 días después del final (`memories_open`); cada hora pg_cron llama a la Edge Function `purge-memories` (sin JWT), que borra con la API de Storage las fotos caducadas.
- Avisos de partida (#36, dentro de la app): cuando alguien empieza un juego, los demás ven en cualquier pestaña de la sala «¡Hay una nueva partida!» con quién y qué juego, y «Entrar al juego» (Música para los turnos de DJ); la pestaña queda marcada hasta visitarla. Sale del evento `round` (INSERT) del canal de la sala, sin canales nuevos (`useGameInvites`, `decideInvite` en `src/lib/gameInvites.ts`, `GameInviteBanner`). No son notificaciones push del sistema.
- Ranking general (#33): puntos de todas las partidas puntuadas del viaje (`trip_ranking`). Una ronda solo cuenta si se reveló: un trigger apunta `game_rounds.revealed_at` al pasar de 'activa' a 'revelada'; las que `end_trip` cierra a medias no cuentan. Se ve en Juegos (se recalcula al revelarse cada ronda) y en el Resumen como ranking final, con empates (`rankStandings`, `TripRanking`).
- COPI Wrapped (#35): en el Resumen, la banda sonora del viaje a partir de `music_queue` (`buildWrapped` en `src/lib/wrapped.ts`, `TripWrapped`): solo cuentan las canciones que sonaron enteras ('reproducida' con `started_at`), las saltadas van aparte, los minutos son aproximados (sin pausas y nunca más que la duración), top 5, artista y DJ del viaje (quien puso más canciones que sonaron).
- Para cerrar el Sprint 2 falta probar en móviles reales (la música con YouTube, GPS en coche y los juegos musicales), ensayar la demo, la retrospectiva y la etiqueta `v0.2-sprint2` con el APK.

## Compilar en Windows

- Proyecto en una ruta corta y sin acentos (por ejemplo `C:\dev\copi`).
- Activar rutas largas (`LongPathsEnabled=1` en el registro) y usar `ninja.exe` 1.12 o posterior en `Android\Sdk\cmake\3.22.1\bin`; si no, falla `buildCMakeDebug` con `mkdir ... No such file or directory`.
- Para compilar más rápido y ocupar menos, en `android/gradle.properties`: `reactNativeArchitectures=arm64-v8a` (la carpeta `android/` no se sube; se regenera con `npx expo prebuild`).
- Versión que funciona sin ordenador (pruebas en coche y demo): `npx expo run:android --variant release --device`.

## Comandos habituales

```
npx expo start                     # servidor de desarrollo
npx expo run:android               # development build local en Android
npx expo start --web               # versión web
npx supabase start                 # Supabase local (Docker)
npx supabase db push               # aplicar migraciones al proyecto remoto
npx supabase functions deploy <f>  # desplegar una Edge Function
npm test                           # pruebas con Jest
npm run test:db                    # pruebas pgTAP de RLS y RPC (Supabase local)
```
