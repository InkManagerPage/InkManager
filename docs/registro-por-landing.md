# Registro según la landing

## Qué cambia

| Entrada     | Registro nuevo                                                                                                      |
| ----------- | ------------------------------------------------------------------------------------------------------------------- |
| `/clientes` | Cuenta `CLIENTE`, sin selector de rol.                                                                              |
| `/estudios` | Elección entre `ARTISTA` y `ESTUDIO_ADMIN`.                                                                         |
| `/`         | Primero se elige «Quiero tatuarme» o «Soy artista o tengo un estudio». Luego se abre el formulario correspondiente. |

Artista pide nombre artístico. Estudio pide nombre del estudio y crea la relación con su administrador en una transacción. Iniciar sesión conserva el rol de la cuenta existente. Los botones «Conocer más» de los planes siguen sin acción.

## Cómo leer el frontend

1. `SiteHeader.tsx` y `LandingHeader.tsx` indican el contexto de su página.
2. `AuthControls.tsx` lo entrega a `RegisterModal` mediante la propiedad `contexto`.
3. `Register.tsx` muestra el formulario de ese público. `src/lib/registro.ts` prepara sus valores iniciales.
4. `users.service.ts` envía el rol y los campos que corresponden a `POST /api/auth/register`. El backend vuelve a validar los datos.

El contexto también se conserva al pasar de «Iniciar sesión» a «Crear cuenta» dentro de una landing. Cerrar y volver a abrir el modal reinicia el formulario.

## Acceso con Google

El login y el registro tienen botones de Google. En el registro, un cliente puede continuar sin completar otros campos. Un profesional debe indicar su nombre artístico o el del estudio. El nombre personal y el email se obtienen de Google; no se pide una contraseña local para este método.

`GET /api/auth/google` inicia un login sin pedir ni aceptar un rol por query.

`POST /api/auth/google/registro` recibe JSON con uno de estos perfiles:

```json
{ "rol": "CLIENTE" }
```

```json
{ "rol": "ARTISTA", "nombreArtistico": "Ana Ink" }
```

```json
{ "rol": "ESTUDIO_ADMIN", "nombreEstudio": "Estudio Ana" }
```

Devuelve `{ "url": "..." }` y guarda la cookie temporal HttpOnly `inkmanager_google_oauth`. El frontend envía este JSON con `apiFetch`, que incluye las cookies, y navega a la URL recibida. Este endpoint no crea una cuenta por sí solo.

El recorrido del backend es:

1. **Controller:** `registroGoogle` recibe la petición y guarda la cookie temporal.
2. **Validación:** `validarPerfilRegistro` acepta los tres roles públicos y exige el nombre adicional de artistas o estudios. Descarta otros campos y rechaza `SUPERADMIN`. Se reutiliza en el registro con contraseña.
3. **Service:** `prepararAccesoGoogle` firma el perfil junto con `state`, `nonce` y `codeVerifier`. El perfil se conserva diez minutos dentro del flujo, no en los parámetros enviados a Google.
4. **Service:** `obtenerIdentidadGoogle` valida ese flujo, intercambia el código y verifica el token de Google. Devuelve la identidad junto con el perfil firmado.
5. **Service:** `resolverUsuarioGoogle` recupera una cuenta existente por su `googleId` sin cambiar su rol. Si es nueva, exige un perfil de registro. Si ya existe otra cuenta con ese email, pide usar el método habitual; no vincula cuentas automáticamente.
6. **Repository:** `crearUsuarioGoogle` guarda el rol elegido y el nombre artístico o estudio. Para estudios, crea y vincula ambos registros en una transacción. Devuelve únicamente los datos públicos necesarios para la sesión.

`GET /api/auth/google/callback` conecta estas funciones. `iniciarSesionGoogle` valida la identidad, resuelve la cuenta, abre una fila en `Sesion` y genera nuestro JWT. El controller guarda la cookie HttpOnly `inkmanager_session`, borra la cookie temporal y vuelve a la Home. El perfil se toma del flujo firmado; un `rol` enviado en la URL del callback no modifica la cuenta.

Ante un error o una cancelación, vuelve a la Home con `google_error=fallido`, `cancelado` o `cuenta`. `GoogleAuthNotice` muestra un aviso de Bootstrap que se puede cerrar. La URL de vuelta se construye con el origen configurado en el servidor; no se acepta una dirección de retorno enviada por el navegador.

## Configuración local

En `Back/.env` se necesitan `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_REDIRECT_URI`, `FRONTEND_URL` y una `JWT_SECRET` propia. Las claves privadas quedan en el backend. Los ejemplos están en los archivos `.env.example`.

- Frontend: `http://127.0.0.1:3001`.
- API: `http://127.0.0.1:4000/api`.
- Callback autorizado en Google: `http://127.0.0.1:4000/api/auth/google/callback`.

Usar el mismo host `127.0.0.1` en todos estos lugares evita mezclar las cookies de `localhost` y `127.0.0.1`. La base debe tener aplicados `prisma/changes/20261024_google_auth.sql` y el cliente Prisma regenerado.

Para verificarlo con una cuenta real: abrir Crear cuenta desde la landing correspondiente, completar el nombre artístico o estudio si aplica y elegir Registrarme con Google. Después de confirmar en Google, la Home debe mostrar el nombre, rol y Cerrar sesión. Luego se puede volver a entrar con Continuar con Google desde el login.

## Verificaciones

- `Back`: compilación correcta y 89 pruebas automáticas aprobadas. Cubren también el registro tradicional, sesiones y permisos existentes.
- Las pruebas nuevas verifican los tres perfiles, cookies, firma y vencimiento del flujo, state, nonce, PKCE, datos del estudio, conservación de roles, conflicto de email y altas simultáneas.
- Las pruebas HTTP del callback cubren alta y sesión para los tres perfiles, consulta de `/me`, revocación con logout, cookies seguras en producción, cancelación, flujo inválido, conflictos y fallo de almacenamiento. Google y la persistencia se simulan: no se crean cuentas en la base real.
- `Front`: `npm run check` completo aprobado: ESLint, formato global, tipos y compilación de producción. En la revisión final se ordenaron con Prettier los 15 archivos que tenían diferencias de formato pendientes.
- Navegador: registro directo de clientes, dos opciones profesionales, campo de estudio, validación de formularios vacíos, ambos recorridos de Home, cambio entre login y registro y reinicio al cerrar. Se revisaron escritorio y anchos de celular, incluido 320 px sin desborde horizontal del modal. No se crearon cuentas reales durante estas comprobaciones.

El 25/10 se comprobó en el navegador que el registro de cliente y estudio, y el botón de login, abren la selección de cuenta de Google real. Se verificaron los errores por nombre artístico o estudio vacío, el aviso del callback inválido y su cierre. El registro se revisó en celular de 390 px sin desborde horizontal. La confirmación final con una cuenta real de Google queda para el usuario: no se eligió ninguna cuenta ni se otorgó consentimiento durante estas pruebas.

Capturas actuales: [registro con Google](google-registro-2026-10-25.jpg) y [aviso de error](google-aviso-2026-10-25.jpg). Las capturas del registro anterior se conservan en los archivos del 24/10.

La [verificación final de autenticación](qa-final-autenticacion-2026-10-25.md) documenta las 89 pruebas automáticas, las 37 comprobaciones de integración real y el recorrido de navegador con limpieza de los datos temporales.
