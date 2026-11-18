# Sprint 2 · La sala cobra vida (23–29 nov)

Objetivo: la sala está viva. Todos ven quién está conectado, la cola de música suena en el móvil del conductor, el GPS mide el viaje y el coche juega a «¿Quién es más probable que…?» y a los tres juegos musicales del plan: «¿Quién la ha puesto?», «Adivina la canción» y los turnos de DJ.

## Historias

| Historia | Qué incluye | Estado |
| --- | --- | --- |
| S2-01 | Migraciones `juegos` y `sala_musica_viaje`, canales privados de Realtime, pruebas pgTAP `sala_rls` (18) y `musica_juegos` (19) | Código hecho · aplicado en Supabase |
| S2-02 | `SessionProvider` con un solo canal privado `sala:<id>` (presence, broadcast y cambios de tablas), `useSession`, `useBroadcast`, `emitter` | Código hecho |
| S2-03 | Pestaña Sala: coche, asientos, conectados, aprobación, copiloto, ajustes y salir | Código hecho |
| S2-04 | Pedir parada: botón fijo, 60 s de espera, aviso enorme y por voz en el Modo conductor | Código hecho |
| S2-05 | Música: buscar, añadir (máximo 3 por persona), cola en vivo y quitar las propias | Código hecho |
| S2-06 | Reproductor del conductor: la cola suena sola en Spotify y avisa a la sala cada 5 s | Código hecho · falta la prueba real con Premium |
| S2-07 | Votar para saltar: «2 de 3», salta con más de la mitad | Código hecho |
| S2-08 | Iniciar y finalizar con GPS: precio propuesto (caché de 12 h), puntos en segundo plano, distancia en vivo, solo finalizar parado | Código hecho · `fuel-price` desplegada · falta la prueba en coche |
| S2-09 | Motor de juegos y «¿Quién es más probable que…?» (60 preguntas) | Código hecho |
| S2-10 | Modo conductor completo: hora, km y tiempo, pasajeros, música, QR, Spotify, iniciar y finalizar, pantalla siempre encendida | Código hecho |
| #22 | «¿Quién la ha puesto?»: con la canción que suena, adivinar quién del coche la puso (20 s, 100 puntos). Quien la puso no vota y Música oculta su nombre durante la ronda | Código hecho · aplicado en Supabase · falta probar en móvil (PR #43) |
| #21 | «Adivina la canción»: 10 s de una canción del viaje desde un segundo al azar en el móvil del conductor y elegir cuál es entre 3–4 (25 s, 100 puntos). Después vuelve la canción de la cola por donde iba | Código hecho · aplicado en Supabase · falta probar con Spotify Premium (PR #44 y #46) |
| #20 | Turnos de DJ en Música: por orden de asiento cada pasajero elige una canción; cuando han sonado todas se vota la mejor sin saber de quién es ni votar la propia (50 puntos al DJ) | Código hecho · aplicado en Supabase · falta probar con 3+ móviles (PR #45 y #46) |

Además: pantalla de **Resumen** (primera versión) al finalizar y pestaña **Viaje** con lo que va costando la gasolina.

El GPS e iniciar/finalizar (S2-08) estaban en el Sprint 3 del plan y se adelantaron a este.

## Juegos musicales

- Usan el motor de rondas de S2-09 (`game_rounds`, `game_round_secrets`, `game_answers`) sin tablas nuevas, salvo la columna `music_queue.dj_round_id` de los turnos de DJ.
- La solución de cada ronda (quién puso la canción, qué canción suena y desde qué segundo) va en `game_round_secrets`, nunca en el payload. En «Adivina la canción», solo el conductor la lee con `get_song_clip` mientras la ronda está activa, porque es su móvil el que pone el fragmento (`useSongQuizHost`).
- «¿Quién la ha puesto?» y «Adivina la canción» son juegos de pantalla (uno activo a la vez, en Juegos). La ronda de DJ va aparte, en Música, y puede coincidir con ellos.
- El conductor no juega: no cuenta para «han respondido todos» en ningún juego (antes, sin su voto, solo se revelaba al acabar el tiempo).
- Las canciones de DJ solo entran por la RPC `add_dj_song`, que comprueba el turno; la política de insert de la cola rechaza un `dj_round_id` directo.
- Límite conocido: `music_queue.added_by` es visible para los miembros y «A continuación» enseña quién puso cada canción, así que en «¿Quién la ha puesto?» se puede hacer trampa con memoria o mirando la base de datos.

### Migraciones del sprint

| Fichero | Qué añade |
| --- | --- |
| `20261118120000_juegos.sql` | Motor de juegos (S2-01) |
| `20261118120100_sala_musica_viaje.sql` | Sala, música, viaje y canales privados (S2-01) |
| `20261118170327_quien_la_puso.sql` | `start_guess_who`; `submit_answer` y `reveal_round` sin quien puso la canción |
| `20261118172329_adivina_cancion.sql` | `start_song_quiz`, `get_song_clip`; el conductor no cuenta al revelar |
| `20261118172404_turnos_dj.sql` | `dj_round_id`, `start_dj_round`, `add_dj_song`, `skip_dj_turn`; votar y puntuar el DJ |

Las tres últimas se aplicaron con el conector de Supabase y el fichero lleva la versión que registró, para que `supabase db push` no las repita.

## Cómo está montado el tiempo real

- Un solo canal privado por sala y móvil: `sala:<session_id>` (`src/services/supabase/roomChannel.ts`). La Sala y el Modo conductor lo comparten, así que ya no puede repetirse el error «cannot add postgres_changes callbacks after subscribe()».
- Lleva presence (quién está conectado), broadcast (`pedir_parada`, `ahora_suena`, `ronda`) y los cambios de `sessions`, `session_members`, `music_queue`, `queue_votes`, `trip_metrics` y `game_rounds`.
- Solo entran los miembros que están dentro (políticas de `realtime.messages`). Quien espera aprobación escucha su canal privado `entrada:<session_id>:<user_id>:…`.
- Cada componente se suscribe solo al evento que le interesa (`useBroadcast`), así un «pedir parada» no vuelve a pintar toda la sala.

## Lo que hay que hacer para probarlo

1. `npx expo install expo-haptics expo-keep-awake expo-speech` (o `npm install`): son paquetes nuevos.
2. Como hay módulos nativos nuevos, volver a compilar: `npx expo run:android`.
3. Spotify (si no está hecho del Sprint 1): `npx supabase secrets set SPOTIFY_CLIENT_ID=... SPOTIFY_CLIENT_SECRET=...` y `EXPO_PUBLIC_SPOTIFY_CLIENT_ID` en `.env`. El conductor conecta su cuenta Premium desde el Modo conductor y deja Spotify abierto en el móvil.
4. Opcional, cuando todo funcione: en Supabase → Realtime → Settings, desactivar *Allow public access*. La app ya usa solo canales privados.

## Demo del 29 de noviembre

- [ ] El conductor crea el viaje, conecta Spotify y activa «Pedir aprobación para entrar».
- [ ] Entran tres pasajeros; el conductor acepta a dos, rechaza a uno y nombra copiloto al del asiento 2.
- [ ] Cada pasajero añade una canción; suena la primera y todos ven «Ahora suena».
- [ ] Dos de tres votan saltar y la canción cambia en menos de 5 segundos.
- [ ] Iniciar viaje: el precio aparece solo y la distancia sube en la pestaña Viaje de los pasajeros.
- [ ] Un pasajero pide parada: el Modo conductor lo muestra en grande y lo dice en voz alta.
- [ ] El copiloto lanza «¿Quién es más probable que…?»; todos votan y ven el resultado a la vez.
- [ ] Con una canción sonando, el copiloto lanza «¿Quién la ha puesto?»: quien la puso ve «La has puesto tú» y los demás aciertan o fallan.
- [ ] (Si da tiempo) «Adivina la canción»: suenan 10 s de otra canción del viaje y luego vuelve la que sonaba.
- [ ] El conductor, parado, finaliza el viaje y todos pasan al resumen con la distancia.

## Pruebas

- Jest: `emitter`, `cooldown`, `queue` (`nextTrack`, `playerAction`, `votesNeeded`), `tripStatus` (`canFinish`, formatos, precio), `probable`, `tally`, `quienLaPuso`, `adivinaCancion` y `dj`. En total, 135 pruebas en verde.
- pgTAP: `sala_rls.test.sql` y `musica_juegos.test.sql` con todos los casos del plan; `quien_la_puso.test.sql` (14), `adivina_cancion.test.sql` (15) y `turnos_dj.test.sql` (15).
  - `adivina_cancion` y `turnos_dj` se han pasado contra el proyecto remoto dentro de una transacción con `rollback`. `quien_la_puso` está sin ejecutar: hace falta `npm run test:db` con Docker.

## Retrospectiva

- Qué fue bien:
- Qué mejorar:
  - Propuesta: las PR encadenadas (#43 → #44 → #45) se fusionaron en sus ramas base después de que #43 entrara en `main`, y #21 y #20 no llegaron a `main` hasta la #46. Si se encadenan PR, fusionar de arriba abajo o cambiar la base a `main` antes de fusionar la de abajo.
- Una acción concreta para el Sprint 3:
