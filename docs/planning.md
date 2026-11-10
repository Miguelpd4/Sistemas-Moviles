# COPI — Planning Scrum

Nov 10, 2026 · @Goats

## 1. Decisiones cerradas

Este plan parte de vuestros requisitos y de las pantallas de referencia (Inicio, Sala, Modo conductor y Resumen). Lo que cambia respecto al documento base:

- **Plataforma**: app nativa en Android (conductor y pasajeros con Android) y versión web de la misma app para los pasajeros con iPhone. La pegatina lleva una URL `https://` que sirve para los dos.
- **Entrada tipo Kahoot**: al escanear, cada pasajero elige nombre y personaje (avatar de la app o foto de la galería) y después su asiento.
- **Gastos**: botón de iniciar y de finalizar viaje; la distancia del GPS × consumo × precio se reparte **a partes iguales**, más gastos extra con foto del ticket. "Bajarse tocando" se mantiene en Android.
- **Música**: cola compartida, votos y salto, turnos de DJ con votación a la mejor canción, adivina la canción en 10 segundos, ¿quién la ha puesto? y resumen musical del viaje.
- **Juegos**: ¿quién es más probable que…?, bingo de carretera, trivial geolocalizado, matrículas y ranking general. El pulsador NFC y la apuesta de llegada quedan fuera.
- **Recuerdos en el perfil**: historial, estadísticas y muro de fotos que caduca a los 7 días.
- **Diseño**: tema claro con naranja como color principal; el Modo conductor en oscuro con el botón "Hablar" (órdenes por voz), que añadimos como funcionalidad.

Tres puntos técnicos a tener en cuenta desde el principio:

- **"Jam de Spotify"**: Spotify no permite crear una Jam real por API. La cola compartida se construye en Supabase y el móvil del conductor la reproduce; para el usuario se verá igual.
- **Adivina la canción**: Spotify ya no da fragmentos de 30 segundos a apps nuevas. Se hace reproduciendo la canción en el móvil del conductor desde un segundo aleatorio durante 10 segundos.
- **Pago dentro de la app**: Bizum no tiene API para particulares. Para la entrega: enlace de PayPal.me con importe, Bizum con teléfono e importe para copiar y "marcar como pagado". Si queréis un pago real dentro de la app en la demo, se puede usar Stripe en modo de pruebas (gratis, sin dinero real).

## 2. Plan de sprints

Cinco sprints de una semana, del 10 de noviembre al 13 de diciembre, con dos hitos: la demo de NFC el 22 de noviembre y el MVP completo el 6 de diciembre.

&#91;embedded content: plan de sprints · 5 sprints y 2 hitos\]

Cada sprint termina con una demo que funciona en un móvil real. Con sprints de una semana, cada persona avanza su módulo en paralelo y cierra sus historias cada domingo. Si algo se retrasa, se recorta el Sprint 4, nunca el MVP. Pregunta abierta: ¿cuál es la fecha exacta de entrega y de defensa?

## 3. Backlog por sprint

Cada línea es una issue de GitHub. Entre corchetes va la etiqueta de módulo. Lo marcado como "si da tiempo" es lo primero que se recorta si una semana no llega.

### Sprint 0 · Preparación (10–15 nov)

Objetivo: que todo el equipo pueda ejecutar la app en su móvil y que la pegatina abra algo.

- [ ] &#91;infra\] Crear el proyecto Expo con TypeScript estricto, expo-router y NativeWind, con la estructura de carpetas acordada.
- [ ] &#91;infra\] Configurar el tablero, las etiquetas, la plantilla de issue y la protección de `main` en GitHub.
- [ ] &#91;nfc\] Compilar un *development build* de Android con `react-native-nfc-manager` y leer la pegatina.
- [ ] &#91;nfc\] Grabar la pegatina con una URL `https://` de prueba: Android abre la app y el iPhone abre la web.
- [ ] &#91;backend\] Crear el proyecto de Supabase, las tablas base con RLS y activar el inicio de sesión anónimo.
- [ ] &#91;infra\] Publicar la versión web (vacía) en Vercel con HTTPS.
- [ ] &#91;musica\] Crear la app en Spotify con la cuenta Premium de un miembro y probar una búsqueda.

### Sprint 1 · Entrada y sala (16–22 nov)

Objetivo: tocar la pegatina y aparecer en la sala de todos. Cierra con la demo de NFC.

- [ ] &#91;entrada\] Como conductor, quiero crear mi cuenta y configurar mi coche (nombre, foto, consumo y combustible).
- [ ] &#91;entrada\] Como conductor, quiero crear un viaje y ver el Modo conductor con el QR.
- [ ] &#91;entrada\] Como pasajero, quiero tocar la pegatina y entrar sin registrarme.
- [ ] &#91;entrada\] Como pasajero, quiero elegir nombre y personaje (avatar de la app o foto de la galería), como en Kahoot.
- [ ] &#91;entrada\] Como pasajero, quiero elegir mi asiento en el dibujo del coche.
- [ ] &#91;entrada\] Como conductor o copiloto, quiero aceptar o rechazar a quien quiere entrar.
- [ ] &#91;sala\] Como pasajero, quiero ver en vivo quién está en el coche (pestaña Sala).
- [ ] &#91;ui\] Pantalla de Inicio y barra de navegación según el diseño.

### Sprint 2 · Música (23–29 nov)

Objetivo: la cola compartida suena en el móvil del conductor y todos la controlan.

- [ ] &#91;musica\] Como conductor, quiero conectar mi Spotify para que mi móvil reproduzca la cola.
- [ ] &#91;musica\] Como pasajero, quiero buscar canciones y añadirlas a la cola.
- [ ] &#91;musica\] Como pasajero, quiero votar en contra de una canción y que se salte si vota la mayoría.
- [ ] &#91;musica\] Como pasajero, quiero turnos de DJ y votar la mejor canción de cada ronda.
- [ ] &#91;musica\] Como pasajero, quiero adivinar una canción que suena 10 segundos desde un punto aleatorio.
- [ ] &#91;musica\] Como pasajero, quiero adivinar quién ha puesto la canción que suena.

### Sprint 3 · Gastos y viaje (30 nov–6 dic)

Objetivo: el viaje se mide con el GPS y cada uno sabe lo que paga. Cierra con el MVP completo.

- [ ] &#91;gastos\] Como conductor, quiero iniciar y finalizar el viaje con un botón y que el GPS mida la distancia.
- [ ] &#91;gastos\] Como conductor, quiero que el precio del combustible se rellene solo con la API del Ministerio (o a mano).
- [ ] &#91;gastos\] Como pasajero, quiero ver al final lo que pago, repartido a partes iguales.
- [ ] &#91;gastos\] Como pasajero, quiero añadir peajes y parkings con foto del ticket.
- [ ] &#91;gastos\] Como pasajero, quiero pagar con PayPal o Bizum desde el Resumen y marcarlo como pagado.
- [ ] &#91;gastos\] Como pasajero, quiero ver en Cuentas mis deudas pendientes.
- [ ] &#91;viaje\] Como pasajero, quiero ver el mapa en vivo y la hora estimada de llegada.
- [ ] &#91;entrada\] Como pasajero con Android, quiero tocar la pegatina al bajarme para cerrar mi parte (si da tiempo).

### Sprint 4 · Juegos y recuerdos (7–13 dic)

Objetivo: lo que impresiona en la defensa y las pruebas que pide la memoria.

- [ ] &#91;juegos\] Lobby de juegos con un juego activo para todo el coche.
- [ ] &#91;juegos\] ¿Quién es más probable que…?, bingo de carretera, trivial geolocalizado y matrículas.
- [ ] &#91;juegos\] Ranking general de todos los juegos.
- [ ] &#91;perfil\] Recuerdos en el perfil: historial, estadísticas y muro de fotos que caduca a los 7 días.
- [ ] &#91;musica\] Resumen musical del viaje, estilo Wrapped (si da tiempo).
- [ ] &#91;plataforma\] Notificaciones: viaje finalizado, deuda pendiente y turno de DJ.
- [ ] &#91;conductor\] Botón "Hablar" del Modo conductor con órdenes por voz (si da tiempo).
- [ ] &#91;pruebas\] Prueba de usabilidad con 5 personas, prueba de campo en coche y prueba de rendimiento.

## 4. Scrum en GitHub

Todo el Scrum vive en el repositorio: el tablero es el *sprint backlog*, cada issue es una historia y cada PR es la evidencia de que se hizo. Eso es lo que mostraréis en el apartado 2 de la memoria.

### Roles

| Rol | Responsabilidad | Persona |
| --- | --- | --- |
| Product Owner | Prioriza el backlog y acepta las historias en la revisión | Por decidir |
| Scrum Master | Modera las reuniones, vigila el tablero y quita bloqueos | Por decidir (rota cada sprint) |
| Desarrollo: entrada y NFC | Pegatina, lobby, roles, aprobación | Por decidir |
| Desarrollo: backend y tiempo real | Supabase, RLS, Realtime, Edge Functions | Por decidir |
| Desarrollo: música | Spotify, cola, juegos musicales | Por decidir |
| Desarrollo: GPS y gastos | Ubicación, reparto, pagos, mapa | Por decidir |
| Desarrollo: interfaz y juegos | Diseño, componentes, juegos, perfil | Por decidir |

PO y Scrum Master también programan; con 5 personas cada uno tiene un módulo.

### Organización del repositorio

- **Tablero** (GitHub Projects): columnas *Backlog*, *Sprint actual*, *En curso*, *En revisión* y *Hecho*.
- **Issues**: una por historia, con etiqueta de módulo (`entrada`, `sala`, `musica`, `gastos`, `viaje`, `juegos`, `perfil`, `backend`, `infra`), prioridad (`must`, `should`, `could`) y el sprint como *milestone*.
- **Ramas**: `main` protegida; una rama por issue, por ejemplo `feat/12-lobby-kahoot` o `fix/30-voto-duplicado`.
- **Pull requests**: enlazan su issue (`Closes #12`) y necesitan la aprobación de otra persona antes de unirse a `main`.
- **Commits**: formato corto y en español, por ejemplo `feat(musica): votos para saltar canción`.
- **Versiones**: una etiqueta al cerrar cada sprint (`v0.1-sprint1`, `v0.2-sprint2`…) con el APK adjunto.
- **Secretos**: `.env` en `.gitignore`; en el repositorio solo un `.env.example` con los nombres de las variables.

### Definición de hecho

Una historia pasa a *Hecho* solo si cumple todo esto:

- [ ] Funciona en un Android real y, si aplica, en la web desde un iPhone.
- [ ] Tiene manejo de errores (sin red, permisos denegados, pegatina no leída).
- [ ] La lógica tiene una prueba (por ejemplo, la fórmula del reparto).
- [ ] Las tablas nuevas tienen política RLS.
- [ ] Otra persona ha revisado y aprobado la PR.

### Ceremonias

| Ceremonia | Cuándo | Duración | Evidencia para la memoria |
| --- | --- | --- | --- |
| Planificación | Lunes que empieza el sprint | 30 min | Issues movidas a *Sprint actual* |
| Reunión diaria | Cada día laborable, por chat vale | 10 min | Mensajes del grupo o comentario en el tablero |
| Revisión | Último día del sprint | 30 min | Demo en móvil y etiqueta de versión |
| Retrospectiva | Justo después de la revisión | 20 min | Acta corta en `docs/sprints/sprint-N.md` |
