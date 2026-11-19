# Sprint 2 · Pruebas en móviles reales

Guion para cerrar lo que falta del Sprint 2: el reproductor con Spotify Premium (S2-06), el GPS en coche (S2-08) y los juegos musicales (#20, #21, #22). Cada prueba tiene pasos y lo que debe pasar. Marcad la casilla si sale bien. Si sale mal, abrid una issue con la etiqueta del módulo (ver «Si algo falla», al final).

## Antes de salir

### Móviles

| Papel | Móvil | Qué necesita |
| --- | --- | --- |
| Conductor | Android con la app en versión release | Cuenta de Spotify **Premium** dada de alta como usuario en la app de Spotify for Developers (máximo 5) y la app de Spotify instalada |
| Pasajero 1 (copiloto) | Android | La app |
| Pasajero 2 | Android | La app |
| Pasajero 3 (opcional) | iPhone | La web desde la pegatina o el QR |

Hacen falta como mínimo el conductor y 2 pasajeros. Con 3 pasajeros se prueba todo, incluido el «2 de 3» para saltar canción.

### Configuración (una vez)

- [ ] En Supabase → Edge Functions → Secrets están `SPOTIFY_CLIENT_ID` y `SPOTIFY_CLIENT_SECRET`. Sin ellos, buscar canciones da «No se ha podido buscar en Spotify».
- [ ] En el `.env` del ordenador que compila están `EXPO_PUBLIC_SPOTIFY_CLIENT_ID`, `EXPO_PUBLIC_SUPABASE_URL` y `EXPO_PUBLIC_WEB_URL`. Las variables `EXPO_PUBLIC_*` se meten en el APK al compilar: si se cambian, hay que volver a compilar.
- [ ] La URL de redirección de la app (la que sale al conectar Spotify) está añadida en la app de Spotify for Developers.
- [ ] La web de Vercel está desplegada con la última versión de `main` (para el iPhone).

### Compilar la versión que funciona sin ordenador

Desde una ruta corta y sin acentos (por ejemplo `C:\dev\copi`), con `main` al día y el móvil del conductor conectado por USB:

```bash
git pull
```

```bash
npx expo prebuild
```

```bash
npx expo run:android --variant release --device
```

Haced lo mismo con los móviles Android de los pasajeros, o pasadles el APK que queda en `android/app/build/outputs/apk/release/`.

### En el móvil del conductor, antes de arrancar

- [ ] Ubicación: «Permitir todo el tiempo» para COPI.
- [ ] Batería: COPI «Sin restricciones» (si no, Android corta el GPS en segundo plano).
- [ ] Spotify abierto y con sesión de la cuenta Premium.
- [ ] Datos móviles activados en todos los móviles.

## A · Entrada y sala (repaso rápido)

- [ ] **A1.** El conductor crea el viaje. Cada pasajero toca la pegatina (o escanea el QR), elige nombre, personaje y asiento, y aparece en la Sala de todos en menos de 3 s.
- [ ] **A2.** El conductor nombra copiloto al pasajero 1. El pasajero 1 ve las opciones de administrar la sala.

## B · Reproductor con Spotify Premium (S2-06)

- [ ] **B1. Conectar.** En el Modo conductor, «Conectar Spotify» abre el inicio de sesión de Spotify y vuelve a la app con la cuenta conectada (sale su nombre).
- [ ] **B2. Buscar.** Un pasajero busca «sola» en Música: salen hasta 10 resultados con carátula.
- [ ] **B3. Empieza solo.** Los pasajeros 1 y 2 añaden una canción cada uno. La primera empieza a sonar en el móvil del conductor sin tocar nada, en menos de 5 s.
- [ ] **B4. «Ahora suena».** En Música de todos los pasajeros aparece la canción con «La puso X» y la barra de progreso avanza. Se actualiza cada 5 s como mucho.
- [ ] **B5. Siguiente canción.** Al acabar la canción (o adelantándola casi al final desde Spotify), empieza la siguiente de la cola y desaparece de «A continuación».
- [ ] **B6. Saltar por votos.** Con 3 pasajeros, dos pulsan «Saltar»: la canción cambia en menos de 5 s. Con un solo voto, no cambia.
- [ ] **B7. Límite.** Un pasajero intenta añadir una cuarta canción con 3 suyas esperando: sale el aviso de que ya tiene 3.
- [ ] **B8. Cola vacía.** Cuando suena la última, al acabar la música se para. Al añadir otra, vuelve a sonar sola.
- [ ] **B9. Spotify cerrado.** Se cierra Spotify en el móvil del conductor: el Modo conductor pide abrir Spotify. Al abrirlo, la cola sigue.
- [ ] **B10. Una hora después.** Tras más de una hora conectados, la música sigue (el token se renueva solo).
- [ ] **B11. Desde la web (sin compilar).** El conductor abre el Modo conductor en el navegador del ordenador (`https://copi-navy.vercel.app`), con la app de Spotify abierta con la cuenta Premium en el ordenador o en el móvil. «Conectar Spotify» abre una ventana, vuelve con la cuenta conectada y la cola suena en esa app de Spotify. Requiere la Redirect URI `https://copi-navy.vercel.app/spotify-auth` en Spotify for Developers.

## C · GPS en coche (S2-08)

Con el coche parado:

- [ ] **C1. Precio.** «Iniciar viaje» propone el precio del combustible de las gasolineras cercanas. Se puede cambiar.
- [ ] **C2. Iniciar.** Al confirmar, los pasajeros ven en Viaje que el viaje ha empezado.

Conduciendo un recorrido de unos 3–5 km conocido (medido antes en Google Maps):

- [ ] **C3. Distancia en vivo.** La distancia sube en la pestaña Viaje de los pasajeros y en el Modo conductor.
- [ ] **C4. Segundo plano.** Con la pantalla del conductor apagada o en otra app durante 2 minutos, la distancia sigue subiendo al volver.
- [ ] **C5. Pedir parada.** Un pasajero pulsa «Pedir parada»: el Modo conductor lo muestra en grande y lo dice en voz alta. El mismo pasajero no puede repetirlo hasta pasados 60 s.
- [ ] **C6. Solo parado.** En marcha, «Finalizar viaje» no deja terminar.

Ya parados:

- [ ] **C7. Finalizar.** El conductor finaliza: todos pasan al Resumen con la distancia.
- [ ] **C8. Distancia correcta.** La distancia del Resumen se parece a la de Google Maps (diferencia de menos de un 10 %).

## D · Juegos musicales

Para D1–D3 tiene que estar sonando la cola en el móvil del conductor.

### «¿Quién la ha puesto?» (#22)

- [ ] **D1.** Con una canción sonando, el copiloto la lanza desde Juegos. Quien la puso ve «La has puesto tú» y no puede votar. Los demás eligen a una persona.
- [ ] **D2.** Mientras dura la ronda, Música no dice «La puso X» en la canción que suena.
- [ ] **D3.** Al votar todos (o a los 20 s) aparece «La puso X» en todos los móviles a la vez. Quien acierta ve «+100 puntos».
- [ ] **D4.** «Otra canción» con la misma canción sonando avisa de que ya se ha jugado con ella.

### «Adivina la canción» (#21)

Hacen falta al menos 3 canciones distintas en el viaje (sonadas o en cola) además de la que suena.

- [ ] **D5. Fragmento.** Al lanzarlo, en menos de 3 s el móvil del conductor deja la canción de la cola y pone otra desde un punto que no es el principio. El Modo conductor dice «suena un fragmento de 10 s».
- [ ] **D6. Vuelta a la cola.** A los 10 s vuelve la canción que sonaba, **por donde iba**.
- [ ] **D7. La cola no se rompe.** Tras el fragmento, la canción de la cola sigue en «Ahora suena» y no se ha saltado a la siguiente. Al acabar, pasa a la siguiente con normalidad.
- [ ] **D8. Resultado.** Los pasajeros eligen entre 3–4 canciones. Al acabar, todos ven «Era… título, artista» y quien acierta, +100.
- [ ] **D9. Sin música.** Con la cola parada (no suena nada), lanzarlo avisa de que no suena ninguna canción.

### Turnos de DJ (#20)

- [ ] **D10. Turnos.** En Música, un pasajero pulsa «Empezar ronda de DJ». Le toca primero al del asiento más bajo. Los demás ven «Le toca a X».
- [ ] **D11. Elegir.** A quien le toca ve «Elige tu canción de DJ» y la añade desde el buscador. El turno pasa al siguiente. Quien no tiene turno no puede añadir canción de DJ.
- [ ] **D12. Saltar turno.** El copiloto pulsa «Saltar el turno de X»: le toca al siguiente.
- [ ] **D13. Votar.** Cuando han sonado todas las canciones de la ronda, aparece «¿Cuál ha sido la mejor canción?». Nadie ve su propia canción entre las opciones.
- [ ] **D14. Resultado.** Al votar todos, aparece la canción ganadora con «DJ: X». El DJ ganador ve «+50 puntos».

## E · Errores y conexión

- [ ] **E1.** Un pasajero pone el modo avión 30 s y lo quita: la sala se reconecta sola y no se pierde ningún cambio de la cola.
- [ ] **E2.** El conductor deniega la ubicación: al iniciar el viaje sale un mensaje claro con el botón para abrir los ajustes.
- [ ] **E3.** iPhone (web): entra por la pegatina, ve la sala, añade una canción y vota en un juego.

## Si algo falla

Abrid una issue en GitHub con:

- **Título:** qué ha pasado, por ejemplo «El fragmento de Adivina la canción no vuelve a la canción de la cola».
- **Etiqueta** del módulo (`musica`, `gastos`, `juegos`…) y el milestone «Sprint 2».
- **Prueba:** el código de la prueba (por ejemplo D6), qué móvil y qué versión de Android.
- **Pasos** para repetirlo, qué esperabais y qué ha pasado.
- **Captura** o vídeo si se puede.

Al terminar, marcad en `sprint-2.md` el estado de cada historia y la lista de la demo.

## Resultado de la sesión

| Fecha | Quién | Móviles | Pruebas que fallan | Issues abiertas |
| --- | --- | --- | --- | --- |
| | | | | |
