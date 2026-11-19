# Sprint 1 · Entrar en el coche (12–22 nov)

Objetivo: tocar la pegatina con un Android o un iPhone y aparecer en la sala del conductor.

## Historias

| Historia | Qué incluye | Estado |
| --- | --- | --- |
| S1-01 | Cliente de Supabase, sesión (anónima y conductor), errores en español | Código hecho |
| S1-02 | Migración `nucleo_tablas`, RLS, Storage, pruebas pgTAP (21) | Código hecho |
| S1-03 | Migración `nucleo_rpc` (`start_session`, `get_session_preview`, `join_session`), pruebas pgTAP (26) | Código hecho |
| S1-04 | `app.config.ts` con App Link, `assetlinks.json`, `vercel.json` | Código hecho · web publicada en copi-navy.vercel.app · huella comprobada (ver abajo) · falta tocar la pegatina con la app instalada |
| S1-05 | Lector NFC en la app, `parseCarCodeFromUrl` | Código hecho · pegatina grabada y probada en la web |
| S1-06 | Entrada tipo Kahoot: bienvenida, nombre y personaje, asiento, espera | Código hecho |
| S1-07 | Mi coche: cuenta de conductor, coche, código de pegatina | Código hecho |
| S1-08 | Inicio, Crear viaje, Modo conductor con QR y pasajeros en vivo | Código hecho |
| S1-09 | Prueba técnica de Spotify (PKCE, reproducción, Edge Function `spotify-search`) | Código hecho · función desplegada · faltan los secretos de Spotify y la prueba real |
| S1-10 | Reparto, deudas y distancia (lógica pura) + pruebas técnicas de GPS y carburantes | Código hecho · función `fuel-price` desplegada · falta la prueba real |
| S1-11 | Coche por marca, modelo, versión y color; foto del modelo (Wikipedia) o silueta de su color. Migración `coche_modelo` (5 pruebas pgTAP) | Código hecho · aplicado en Supabase |
| S1-12 | Rediseño «Noche»: tema oscuro por defecto y claro opcional (Perfil → Apariencia), fuente Inter, matrícula como código del coche | Código hecho |
| S1-13 | Seguridad: quitar a la API el permiso sobre `rls_auto_enable()` (aviso del Security Advisor) | Hecho · aplicado en Supabase |

S1-11, S1-12 y S1-13 se añadieron durante el sprint a petición del equipo.

«Código hecho» significa: escrito, con sus pruebas de lógica y de base de datos pasando.
Cada historia pasa a *Hecho* cuando cumple sus criterios de aceptación en un móvil real.

## Lo que queda para cerrar el sprint

1. **App Link (S1-04).** `assetlinks.json` lleva la huella del certificado de depuración que usan los
   proyectos de Expo. **Comprobada el 19 nov:** la plantilla de `npx expo prebuild` del SDK 58 trae ese
   mismo `debug.keystore` (SHA-256 `FA:C6:17:…:3B:9C`) y también firma con él la versión release, así que
   vale para `npx expo run:android` y para `--variant release`. Solo cambiaría si alguien usa un keystore
   propio (`cd android && ./gradlew signingReport` lo dice). Falta: abrir
   `https://copi-navy.vercel.app/.well-known/assetlinks.json` para ver que sale el JSON, reinstalar la app
   (`npx expo run:android`) y tocar la pegatina: debe abrirse Copi, no el navegador.
   Si sigue abriendo el navegador: Ajustes → Aplicaciones → Copi → Abrir de forma predeterminada →
   activar `copi-navy.vercel.app`.
2. **Spotify (S1-09).** Crear la app en developer.spotify.com (Redirect URI: la que sale en Perfil →
   Pruebas técnicas → Spotify), añadir a los 5 del grupo como usuarios, guardar los secretos con
   `npx supabase secrets set SPOTIFY_CLIENT_ID=... SPOTIFY_CLIENT_SECRET=...` y poner
   `EXPO_PUBLIC_SPOTIFY_CLIENT_ID` en `.env`. Probar con una cuenta Premium y rellenar las conclusiones.
3. **GPS y carburantes (S1-10).** Un trayecto real de 10–15 minutos con la prueba de GPS y una consulta de
   precio. Rellenar las conclusiones.
4. **Ensayo de la demo** con la lista de abajo.
5. ~~**PR** `feat/sprint-1` → `main`, revisada y aprobada por otra persona.~~ Hecho (PR #40).

## Conclusiones de las pruebas técnicas (rellenar)

### Spotify (S1-09)

- ¿Suena en el móvil del conductor? 
- Tiempo de respuesta de *Reproducir*: 
- ¿Hace falta tener la app de Spotify abierta? 
- ¿Sigue sonando con la pantalla apagada? 
- ¿La renovación del token funciona (botón «Forzar caducidad»)? 

### GPS (S1-10)

- Recorrido y duración de la prueba: 
- Distancia de Copi frente a la real: 
- ¿Sigue sumando con la pantalla apagada? 
- Precisión típica de los puntos: 

### Carburantes (S1-10)

- Precio devuelto en Córdoba y combustible: 
- Tiempo de la primera llamada (descarga del Ministerio) y de las siguientes: 
- Nombres de los campos de precio (salen en los logs de la función): 

## Demo del 22 de noviembre

- [ ] El conductor inicia sesión y ve su coche (foto del modelo o silueta de su color) con la matrícula.
- [ ] Crear viaje abre el Modo conductor con el QR y «0 pasajeros».
- [ ] Un Android toca la pegatina y se abre Copi en «Estás en el coche de…».
- [ ] Elige nombre, personaje y asiento y entra.
- [ ] Un iPhone toca la pegatina, se abre la web y hace lo mismo.
- [ ] Un tercer pasajero entra escaneando el QR.
- [ ] Los tres aparecen en el Modo conductor sin recargar.

## Retrospectiva

- Qué fue bien:
- Qué mejorar:
- Una acción concreta para el Sprint 2:
