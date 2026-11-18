# Sprint 2 · La sala cobra vida (23–29 nov)

Objetivo: la sala está viva. Todos ven quién está conectado, la cola de música suena en el móvil del conductor, el GPS mide el viaje y el coche juega a «¿Quién es más probable que…?».

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

Además: pantalla de **Resumen** (primera versión) al finalizar y pestaña **Viaje** con lo que va costando la gasolina.

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
- [ ] El conductor, parado, finaliza el viaje y todos pasan al resumen con la distancia.

## Pruebas

- Jest: `emitter`, `cooldown`, `queue` (`nextTrack`, `playerAction`, `votesNeeded`), `tripStatus` (`canFinish`, formatos, precio), `probable` y `tally`.
- pgTAP: `sala_rls.test.sql` y `musica_juegos.test.sql` con todos los casos del plan.

## Retrospectiva

- Qué fue bien:
- Qué mejorar:
- Una acción concreta para el Sprint 3:
