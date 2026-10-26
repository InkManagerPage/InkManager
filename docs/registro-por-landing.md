# Registro y acceso

## Tipo de cuenta según la página

| Entrada     | Registro                                                                      |
| ----------- | ----------------------------------------------------------------------------- |
| `/clientes` | Cuenta `CLIENTE`, sin selector de rol.                                        |
| `/estudios` | Elección entre `ARTISTA` y `ESTUDIO_ADMIN`.                                   |
| `/`         | Elección entre cliente y profesional, seguida del formulario correspondiente. |

El registro con contraseña pide nombre, email, contraseña y confirmación. Artista requiere nombre artístico; estudio requiere nombre del estudio. El backend valida los datos y crea el estudio y su vínculo con el administrador en una transacción. Iniciar sesión conserva el rol existente.

El registro con Google obtiene el nombre personal y el email del proveedor. Un profesional completa su nombre artístico o el del estudio antes de continuar. La cuenta se crea sin contraseña local y recibe un enlace opcional para definirla.

## Componentes del frontend

| Archivo                                | Responsabilidad                                       |
| -------------------------------------- | ----------------------------------------------------- |
| `SiteHeader.tsx` y `LandingHeader.tsx` | Definen el contexto de registro de cada página.       |
| `AuthControls.tsx`                     | Muestra la sesión y abre los modales de acceso.       |
| `Register/Register.tsx`                | Presenta el formulario según el público y el rol.     |
| `Login/Login.tsx`                      | Presenta el login con contraseña o Google.            |
| `src/lib/registro.ts`                  | Define los valores iniciales del registro.            |
| `AuthField.tsx`                        | Campo con label, errores y visibilidad de contraseña. |
| `GoogleButton.tsx`                     | Botón de Google compartido entre login y registro.    |
| `users.service.ts` y `auth.service.ts` | Realizan las peticiones al backend.                   |
| `AuthProvider.tsx`                     | Comparte el usuario de la sesión entre páginas.       |

El contexto se conserva al alternar login y registro. Cerrar el modal reinicia el formulario. Las validaciones se ejecutan en el navegador y nuevamente en el backend. El registro con contraseña intenta iniciar sesión después de crear la cuenta; si ese login falla, informa que el alta está completada.

## Flujo de Google

`GET /api/auth/google` inicia el login. `POST /api/auth/google/registro` prepara un registro y acepta uno de estos perfiles:

```json
{ "rol": "CLIENTE" }
```

```json
{ "rol": "ARTISTA", "nombreArtistico": "Ana Ink" }
```

```json
{ "rol": "ESTUDIO_ADMIN", "nombreEstudio": "Estudio Ana" }
```

El endpoint devuelve una URL y guarda el flujo firmado durante diez minutos en la cookie HttpOnly `inkmanager_google_oauth`. El flujo contiene el perfil, state, nonce y codeVerifier. La preparación del registro no crea una cuenta.

En `GET /api/auth/google/callback`, el backend valida el flujo, intercambia el código, verifica la identidad y busca la cuenta por `googleId`. Una cuenta existente conserva su rol. Una nueva requiere un perfil válido. Si el email ya pertenece a otra cuenta, se rechaza la vinculación automática y se indica usar el método habitual.

El backend crea su propia sesión, establece la cookie `inkmanager_session`, borra la cookie temporal y vuelve a la Home. `AuthProvider` consulta `/api/auth/me` y muestra al usuario. Un rol enviado por query no modifica la cuenta.

Ante cancelación o error, la Home recibe `google_error=cancelado`, `cuenta` o `fallido`. `GoogleAuthNotice` presenta el aviso correspondiente. La dirección de retorno procede de la configuración del servidor.

## Configuración

| Variable de `Back/.env` | Uso                                                          |
| ----------------------- | ------------------------------------------------------------ |
| `JWT_SECRET`            | Firma de tokens propios; clave privada de al menos 32 bytes. |
| `FRONTEND_URL`          | Origen del frontend y destino del callback.                  |
| `GOOGLE_CLIENT_ID`      | Identificador del cliente OAuth.                             |
| `GOOGLE_CLIENT_SECRET`  | Credencial privada del cliente OAuth.                        |
| `GOOGLE_REDIRECT_URI`   | Callback autorizado en Google.                               |

En desarrollo, el frontend usa `http://127.0.0.1:3001`, la API `http://127.0.0.1:4000/api` y el callback `http://127.0.0.1:4000/api/auth/google/callback`. Frontend, API y configuración OAuth utilizan el mismo host para conservar la coherencia de orígenes y cookies.

El frontend configura la API mediante `NEXT_PUBLIC_API_URL` en `Front/.env.local`. Las credenciales privadas permanecen en el backend.

La recuperación de acceso y los correos de la cuenta se describen en [correos y recuperación](correos-y-recuperacion.md).
