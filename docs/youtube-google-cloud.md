# Música con YouTube: configurar Google Cloud (#54)

COPI busca y reproduce la música con YouTube. Cada **conductor** conecta **su propia cuenta de Google** en COPI. La música suena **dentro de la app**, en el reproductor de YouTube, sin ninguna otra app abierta.

Esto se configura **una vez para todo el grupo**, en un proyecto de Google Cloud.

## 1. Crear el proyecto y activar la API

1. Entrad en https://console.cloud.google.com con una cuenta de Google del grupo.
2. Arriba, selector de proyectos → **Proyecto nuevo** → nombre `COPI` → **Crear**. Comprobad que queda seleccionado.
3. Menú ☰ → **APIs y servicios** → **Biblioteca** → buscad **YouTube Data API v3** → **Habilitar**.

## 2. Pantalla de consentimiento (quién puede entrar)

1. Menú ☰ → **APIs y servicios** → **Pantalla de consentimiento de OAuth**. En consolas nuevas se llama **Google Auth Platform**. Pulsad **Comenzar**.
2. Rellenad:
   - **Nombre de la app**: `COPI`.
   - **Correo de asistencia**: el vuestro.
   - **Público**: **Externo**.
   - **Información de contacto**: vuestro correo.
3. **Público** (o *Audience*) → **Usuarios de prueba** → **Añadir usuarios**. Añadid el **Gmail de cada persona que vaya a conducir**, hasta 100.
4. **Acceso a datos** (o *Data access*) → **Añadir o quitar permisos** → marcad `.../auth/youtube.readonly` → **Actualizar** → **Guardar**.

Mientras la app esté **«En pruebas»**:
- Solo pueden entrar los usuarios de prueba.
- Google muestra el aviso «Google no ha verificado esta app»: pulsad **Continuar**.
- La sesión caduca a los 7 días y hay que volver a conectar.

## 3. Cliente «Aplicación web» (la web y el Client ID que usa Android)

1. **APIs y servicios** → **Credenciales** → **Crear credenciales** → **ID de cliente de OAuth**.
2. **Tipo de aplicación**: **Aplicación web**. **Nombre**: `COPI web`.
3. **Orígenes de JavaScript autorizados**:
   - `https://copi-navy.vercel.app`
   - `http://localhost:8081`, para probar con `npx expo start --web`.
4. **URIs de redireccionamiento autorizados**:
   - `https://copi-navy.vercel.app/youtube-auth`
   - `http://localhost:8081/youtube-auth`
5. **Crear**. Copiad el **ID de cliente**, el que termina en `.apps.googleusercontent.com`. Es público.

## 4. Cliente «Android» (para que Google reconozca el APK)

1. **Crear credenciales** → **ID de cliente de OAuth** → **Tipo de aplicación**: **Android**.
2. **Nombre del paquete**: `es.uco.copi`.
3. **Huella digital del certificado SHA-1**: `5E:8F:16:06:2E:A3:CD:2C:4A:0D:54:78:76:BA:A6:F3:8C:AB:F6:25`.

   Es la del certificado de depuración de la plantilla de Expo, con el que se firman `npx expo run:android` y `--variant release`. Si alguien usa un certificado propio, saca su huella con `cd android && ./gradlew signingReport` y añade otro cliente Android con ella.
4. **Crear**. Este ID **no** se copia en ningún sitio: Google lo reconoce por el paquete y la huella.

## 5. Poner el Client ID en COPI

El **ID de cliente web** del paso 3 va en tres sitios:

- **`.env.example`**, en el repositorio: `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID=<id>`. Así basta con copiarlo a `.env`.
- **`.env`** del ordenador que compila el APK: la misma línea. Después hay que **recompilar**:

  ```bash
  npx expo run:android --variant release --device
  ```

- **Vercel** → proyecto `copi` → **Settings** → **Environment Variables**: `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID` para Production y Preview. Después, **Deployments** → **⋯** → **Redeploy**.

## 6. Probarlo

En COPI → **Perfil** → **Música con YouTube (prueba)** → **Prueba de YouTube**:

1. **Conectar YouTube** → elegid vuestra cuenta de Google (tiene que ser usuario de prueba) → aceptad el permiso de YouTube.
2. Buscad «Columbia Quevedo»: deben salir canciones, primero las de «Audio oficial».
3. **Poner**: la canción suena **dentro de COPI**, con el vídeo visible.
4. **Fragmento de 10 s al azar**: suena 10 segundos desde un punto al azar y se pausa, como en «Adivina la canción».

| Mensaje | Qué hacer |
| --- | --- |
| «Falta EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID…» | Falta el Client ID en `.env` (y recompilar) o en Vercel (y Redeploy). |
| «Google no reconoce esta app…» (Android) | Falta el cliente Android del paso 4, o el paquete o la huella SHA-1 no coinciden. |
| «Acceso bloqueado: COPI no ha completado el proceso de verificación» | Esa cuenta no está en **Usuarios de prueba** (paso 2.3). |
| «redirect_uri_mismatch» (web) | Falta la URI de redireccionamiento del paso 3.4, escrita exactamente igual. |
| «La YouTube Data API v3 no está activada…» | Paso 1.3. |
| «Se han acabado las búsquedas de YouTube de hoy» | El cupo gratuito es de unas 100 búsquedas al día. Al día siguiente vuelve. |
| Error 153 en el reproductor | Avisad: hay que revisar el origen del reproductor (`src/services/youtube/playerHtml.ts`). |
