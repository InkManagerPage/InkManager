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

## Preparación para Google

El acceso con Google sigue en desarrollo. Esta modificación prepara los perfiles de registro; todavía faltan el callback HTTP, la apertura de sesión propia desde ese callback y los botones del frontend.

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

Devuelve `{ "url": "..." }` y guarda la cookie temporal HttpOnly `inkmanager_google_oauth`. Cuando agreguemos el botón de Google, el frontend deberá enviar este JSON con `credentials: 'include'` y navegar a la URL recibida. Este endpoint no crea una cuenta por sí solo.

El recorrido del backend es:

1. **Controller:** `registroGoogle` recibe la petición y guarda la cookie temporal.
2. **Validación:** `validarPerfilRegistro` acepta los tres roles públicos y exige el nombre adicional de artistas o estudios. Descarta otros campos y rechaza `SUPERADMIN`. Se reutiliza en el registro con contraseña.
3. **Service:** `prepararAccesoGoogle` firma el perfil junto con `state`, `nonce` y `codeVerifier`. El perfil se conserva diez minutos dentro del flujo, no en los parámetros enviados a Google.
4. **Service:** `obtenerIdentidadGoogle` valida ese flujo, intercambia el código y verifica el token de Google. Devuelve la identidad junto con el perfil firmado.
5. **Service:** `resolverUsuarioGoogle` recupera una cuenta existente por su `googleId` sin cambiar su rol. Si es nueva, exige un perfil de registro. Si ya existe otra cuenta con ese email, pide usar el método habitual; no vincula cuentas automáticamente.
6. **Repository:** `crearUsuarioGoogle` guarda el rol elegido y el nombre artístico o estudio. Para estudios, crea y vincula ambos registros en una transacción. Devuelve únicamente los datos públicos necesarios para la sesión.

El próximo paso guiado es conectar estas funciones con `GET /api/auth/google/callback`, crear la sesión propia y volver al frontend. El callback deberá tomar el perfil del flujo verificado, nunca de un `rol` recibido en su URL.

## Verificaciones

- `Back`: compilación correcta y 79 pruebas automáticas aprobadas. Cubren también el registro tradicional, sesiones y permisos existentes.
- Las pruebas nuevas verifican los tres perfiles, cookies, firma y vencimiento del flujo, state, nonce, PKCE, datos del estudio, conservación de roles, conflicto de email y altas simultáneas.
- Las pruebas de Google y persistencia usan servicios simulados y credenciales ficticias. No confirman un acceso real con una cuenta de Google; ese recorrido se comprobará al implementar el callback.
- `Front`: ESLint, tipos y compilación de producción correctos. El chequeo de formato de los archivos modificados también pasa. El comando global `npm run check` se detiene en `format:check` por diferencias de formato previas en otros 19 archivos; las comprobaciones de tipos y compilación se ejecutaron por separado.
- Navegador: registro directo de clientes, dos opciones profesionales, campo de estudio, validación de formularios vacíos, ambos recorridos de Home, cambio entre login y registro y reinicio al cerrar. Se revisaron escritorio y anchos de celular, incluido 320 px sin desborde horizontal del modal. No se crearon cuentas reales durante estas comprobaciones.

Capturas: [cliente](registro-cliente-2026-10-24.jpg), [artista](registro-profesional-2026-10-24.jpg) y [estudio](registro-estudio-movil-2026-10-24.jpg).
