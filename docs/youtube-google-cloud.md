# Música con YouTube: la clave de COPI (#54)

COPI busca la música en YouTube y la reproduce **dentro de la app**. **Nadie inicia sesión**: ni el conductor ni los pasajeros necesitan cuenta de Google ni de YouTube, y lo puede usar cualquiera.

La búsqueda usa **una clave de YouTube de COPI**, guardada solo en Supabase (Edge Function `youtube-search`):
- **No es la cuenta de nadie**: solo identifica a la app ante YouTube para poder buscar.
- **No reproduce nada en ningún sitio**: cada canción suena en el reproductor de YouTube dentro de COPI, en el móvil de cada conductor.
- **Es gratis**: unas **100 búsquedas nuevas al día** entre todos. Las búsquedas repetidas en 6 horas no gastan.

Esto se configura **una vez para todo el grupo**.

## 1. Proyecto de Google Cloud y API

1. https://console.cloud.google.com → selector de proyectos (arriba) → **Proyecto nuevo** → `COPI` → **Crear**. Comprobad que arriba pone **COPI**.
2. Menú ☰ → **APIs y servicios** → **Biblioteca** → **YouTube Data API v3** → **Habilitar**.

No hace falta pantalla de consentimiento, usuarios de prueba ni clientes OAuth.

## 2. Crear la clave

1. **APIs y servicios** → **Credenciales** → **Crear credenciales** → **Clave de API**. Copiadla.
2. Pulsad sobre la clave nueva → **Restricciones de API** → **Restringir clave** → marcad solo **YouTube Data API v3** → **Guardar**.

   Así, si alguien la viera, solo serviría para buscar en YouTube.

## 3. Guardarla en Supabase

1. https://supabase.com/dashboard/project/dytieuiyvrsejwvcvirh/functions/secrets
2. **Name**: `YOUTUBE_API_KEY`. **Value**: la clave. Pulsad **Save**.

**No la pongáis en `.env`, ni en Vercel, ni en el código, ni en el chat**: solo en Supabase.

## 4. Probarlo

La función `youtube-search` ya está desplegada. Si hay que volver a desplegarla:

```bash
npx supabase functions deploy youtube-search
```

En la sala (#57):

1. El conductor crea un viaje y abre el **Modo conductor**: sale «Música de la sala» con el reproductor.
2. Un pasajero busca en **Música** y añade una canción: empieza a sonar sola en el Modo conductor.
3. En la web, si el navegador no deja que la música empiece sola, pulsad ▶ en el vídeo una vez.

La prueba técnica sigue en **Perfil** → **Música con YouTube (prueba)** → **Prueba de YouTube**: buscar, **Poner**, pausa y **Fragmento de 10 s al azar**.

El reproductor necesita `react-native-webview`, un módulo nativo nuevo. Hay que **recompilar el APK una vez**:

```bash
npx expo run:android --variant release --device
```

| Mensaje | Qué hacer |
| --- | --- |
| «Falta YOUTUBE_API_KEY en los secretos…» | Paso 3. |
| «La clave de YouTube no es válida o no tiene activada la YouTube Data API v3…» | Revisad los pasos 1.2 y 2, y que la clave esté bien copiada, sin espacios. |
| «Se han acabado las búsquedas de YouTube de hoy» | El cupo gratuito es de unas 100 búsquedas nuevas al día. Al día siguiente vuelve. |
| «El dueño de este vídeo no deja ponerlo fuera de YouTube» | Elegid otra versión de la canción, por ejemplo la de «Audio oficial». |
| Error 153 en el reproductor | Avisad: hay que revisar el origen del reproductor (`src/services/youtube/playerHtml.ts`). |
