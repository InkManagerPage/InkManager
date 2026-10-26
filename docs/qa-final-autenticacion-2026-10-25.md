# Verificación final de autenticación · 25/10/2026

Rama: `auth-google`. No se hizo commit, push ni merge durante esta revisión.

## Resultado

| Comprobación                                 | Resultado                                      |
| -------------------------------------------- | ---------------------------------------------- |
| Compilación del backend (`npm run build`)    | Aprobada                                       |
| Suite del backend y validadores del frontend | 89 pruebas aprobadas, 0 fallidas               |
| Frontend (`npm run check`)                   | ESLint, formato, tipos y compilación aprobados |
| API, PostgreSQL y Cloudinary reales          | 37 comprobaciones aprobadas                    |
| Interfaz con una cuenta temporal de estudio  | 9 comprobaciones aprobadas                     |
| `git diff --check`                           | Sin errores                                    |

El chequeo global detectó diferencias de formato pendientes en 15 archivos del frontend. Se corrigieron con Prettier, sin modificar su comportamiento, y se volvió a ejecutar `npm run check` completo.

## Pruebas automatizadas

La suite cubre el registro de cliente, artista y administrador de estudio; datos inválidos y duplicados; hash de contraseña; login, JWT, cookies y consulta de sesión; vencimiento, revocación y logout; permisos por rol; CORS; carga de imágenes y rechazos de tamaño, formato y firma; verificación de email.

Google se simula en esta suite para probar state, nonce, PKCE, firma y vencimiento del flujo, cuentas nuevas y existentes, conservación del rol, conflictos de email, creación atómica del estudio, callback, sesión propia, `/me`, logout, cancelaciones y fallos de almacenamiento.

## Integración real

Se ejecutaron peticiones contra `http://127.0.0.1:4000/api`, usando PostgreSQL y Cloudinary configurados en el entorno local:

- Alta, datos públicos, hash, rechazo de duplicados, login, cookie, `/me`, CORS, logout y rechazo de la sesión revocada para los tres roles públicos.
- Persistencia del nombre artístico y relación entre estudio y administrador.
- Rechazo de alta pública con `SUPERADMIN` y de upload sin sesión.
- Upload autenticado de un PNG de prueba a Cloudinary.
- Inserción de perfiles Google sin contraseña y sus sesiones dentro de una transacción revertida, para comprobar las restricciones físicas de la base sin conservar esas cuentas.

Se eliminaron las tres cuentas de prueba, su estudio, sus tres sesiones y la imagen subida. El informe [de integración](qa-final-integracion-2026-10-25.json) contiene los 37 resultados y la confirmación de limpieza; no incluye contraseñas, cookies ni tokens.

## Navegador

Se creó una cuarta cuenta temporal, esta vez desde el formulario de estudio. Se comprobó el inicio automático, el rol visible, la persistencia al recargar, logout, login con email y contraseña, navegación a Home conservando la sesión, logout persistente tras recargar y consola sin errores.

Al terminar se eliminaron esa cuenta, su estudio y las dos sesiones utilizadas. Los resultados están en el [informe de navegador](qa-final-navegador-2026-10-25.json).

![Sesión temporal de estudio conservada después de recargar](qa-final-sesion-estudio-2026-10-25.jpg)

## Alcance y configuración

Esta revisión final no eligió una cuenta personal de Google ni otorgó consentimiento en nombre del usuario. La apertura de Google se había comprobado en el navegador y el usuario confirmó que el acceso real funcionó. El intercambio y callback exitosos están cubiertos con Google simulado en las pruebas automáticas.

El frontend debe abrirse en `http://127.0.0.1:3001`, en coherencia con `FRONTEND_URL`, la API y el callback de Google. `localhost` y `127.0.0.1` tienen orígenes y cookies distintos; no se amplió CORS durante estas pruebas.

Las vistas privadas por rol siguen pendientes y se dejaron para una sesión posterior, por indicación del usuario. No se agregaron cambios de rol, vinculación de Google a una cuenta con contraseña ni alta de contraseña para cuentas Google.
