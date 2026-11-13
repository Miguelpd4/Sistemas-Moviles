# Sprint 1 · Entrar en el coche (12–22 nov)

Objetivo: tocar la pegatina con un Android o un iPhone y aparecer en la sala del conductor.

## Historias

| Historia | Qué incluye | Estado |
| --- | --- | --- |
| S1-01 | Cliente de Supabase, sesión (anónima y conductor), errores en español | Código hecho |
| S1-02 | Migración `nucleo_tablas`, RLS, Storage, pruebas pgTAP (21) | Código hecho |
| S1-03 | Migración `nucleo_rpc` (`start_session`, `get_session_preview`, `join_session`), pruebas pgTAP (26) | Código hecho |
| S1-04 | `app.config.ts` con App Link, `assetlinks.json`, `vercel.json` | Código hecho · falta huella SHA-256 y publicar |
| S1-05 | Lector NFC en la app, `parseCarCodeFromUrl` | Código hecho · falta probar con la pegatina |
| S1-06 | Entrada tipo Kahoot: bienvenida, nombre y personaje, asiento, espera | Código hecho |
| S1-07 | Mi coche: cuenta de conductor, coche, código de pegatina | Código hecho |
| S1-08 | Inicio, Crear viaje, Modo conductor con QR y pasajeros en vivo | Código hecho |
| S1-09 | Prueba técnica de Spotify (PKCE, reproducción, Edge Function `spotify-search`) | Código hecho · falta la prueba real |
| S1-10 | Reparto, deudas y distancia (lógica pura) + pruebas técnicas de GPS y carburantes | Código hecho · falta la prueba real |

«Código hecho» significa: escrito, con sus pruebas de lógica y de base de datos pasando.
Cada historia pasa a *Hecho* cuando cumple sus criterios de aceptación en un móvil real.

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

- [ ] El conductor inicia sesión y ve su coche con el código.
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
