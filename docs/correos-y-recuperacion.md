# Correos y recuperación de acceso

## Eventos de correo

| Evento                          | Correo                                                                                |
| ------------------------------- | ------------------------------------------------------------------------------------- |
| Registro con email y contraseña | Bienvenida con enlace para verificar el email, válido durante 24 horas.               |
| Primer registro con Google      | Bienvenida con enlace opcional para crear una contraseña, válido durante 30 minutos.  |
| Solicitud de recuperación       | Enlace de un solo uso para crear o restablecer contraseña, válido durante 30 minutos. |
| Cambio de contraseña completado | Confirmación del cambio y aviso de cierre de las sesiones anteriores.                 |
| Solicitud de verificación       | Nuevo enlace si el email de la cuenta no está verificado.                             |

El login no envía correos. Una cuenta de Google conserva ese método de acceso cuando agrega una contraseña. Las contraseñas no se envían por email. El acceso a la aplicación no exige que el email esté verificado.

## Transporte y configuración

El backend envía los correos mediante la [API de Resend](https://resend.com/docs/api-reference/emails/send-email). Cada envío utiliza una clave de idempotencia y un tiempo de espera máximo de ocho segundos.

| Variable de `Back/.env` | Uso                                                                   |
| ----------------------- | --------------------------------------------------------------------- |
| `MAIL_TRANSPORT`        | `resend` envía por Internet; `preview` guarda una vista previa local. |
| `RESEND_API_KEY`        | Credencial privada del proveedor, requerida para `resend`.            |
| `MAIL_FROM`             | Nombre y dirección del remitente.                                     |
| `FRONTEND_URL`          | Origen de las páginas incluidas en los enlaces.                       |

Ejemplo de remitente con dominio verificado:

```dotenv
MAIL_TRANSPORT=resend
MAIL_FROM="InkManager <cuentas@tu-dominio-verificado.com>"
```

El remitente de prueba `InkManager <onboarding@resend.dev>` solo admite envíos a la dirección asociada a la cuenta de Resend. Los envíos a otras personas requieren un dominio propio verificado. Las credenciales quedan en el backend y los archivos `.env` están excluidos de Git.

La consola indica el transporte activo al iniciar el servidor. En desarrollo, nodemon observa `src/` y `.env`; los cambios reinician el proceso y recargan la configuración. Los errores de correo muestran mensajes propios sin imprimir claves, destinatarios ni respuestas privadas del proveedor.

En desarrollo el transporte predeterminado es `preview`. Los archivos JSON de `Back/.mail-preview/` contienen texto, HTML y enlace del correo; son privados, están ignorados por Git y no se exponen por HTTP. No se reenvían automáticamente al seleccionar Resend. En producción preview está deshabilitado y la recuperación responde `503` si falta la configuración de correo.

## Enlaces y persistencia

`TokenCuenta` almacena el hash SHA-256 del enlace, usuario, propósito, vencimiento y fecha de uso. Existe un enlace por usuario y propósito; otro envío reemplaza el anterior. La tabla tiene RLS habilitado y se usa mediante el backend propio.

La actualización del token, la escritura de la contraseña bcrypt y la revocación de sesiones se ejecutan en una transacción. Una actualización condicional impide consumir el mismo enlace dos veces. El campo `tokenVerificacionEmail` de Usuario no participa en este flujo.

Los tokens viajan en el fragmento `#` del enlace y después en el cuerpo del POST. No se guardan en localStorage ni aparecen en respuestas de la API. Las páginas de enlaces usan `no-referrer`. Abrir un enlace no consume el token: la persona confirma la acción en la pantalla correspondiente.

## Endpoints

Las rutas parten de `/api/auth` y reciben JSON.

| Método y ruta                 | Cuerpo                                                            | Respuesta                                                     |
| ----------------------------- | ----------------------------------------------------------------- | ------------------------------------------------------------- |
| `POST /forgot-password`       | `{ "email": "persona@example.com" }`                              | `202`, con el mismo mensaje exista o no la cuenta.            |
| `POST /resend-verification`   | `{ "email": "persona@example.com" }`                              | `202`; omite el envío si ya está verificado.                  |
| `POST /reset-password`        | `{ "token": "...", "password": "...", "confirmPassword": "..." }` | `200`, actualiza contraseña, revoca sesiones y limpia cookie. |
| `POST /verify-email`          | `{ "token": "..." }`                                              | `200`, verifica email.                                        |
| `GET /verify-email?token=...` | Token en la URL                                                   | `303` hacia la pantalla, sin consumir el enlace.              |

Los enlaces inválidos, vencidos o usados devuelven `400`. Las solicitudes de correo admiten hasta cinco peticiones por IP cada quince minutos y evitan reenvíos inmediatos a la misma cuenta y propósito. El consumo de enlaces admite quince intentos por IP cada quince minutos.

## Módulos

| Ubicación                                          | Responsabilidad                                                     |
| -------------------------------------------------- | ------------------------------------------------------------------- |
| `Back/src/config/correos.ts`                       | Valida transporte y configuración.                                  |
| `Back/src/correos/`                                | Tipos, plantillas, envío y errores del correo.                      |
| `Back/src/tokens-cuenta/`                          | Controlador, servicio, repositorio, entidad y rutas de los enlaces. |
| `Front/src/components/forms/RequestEmailForm.tsx`  | Solicitud de recuperación o verificación.                           |
| `Front/src/components/forms/ResetPasswordForm.tsx` | Formulario de nueva contraseña.                                     |
| `Front/src/components/auth/VerifyEmail.tsx`        | Confirmación de email.                                              |
| `Front/src/components/auth/AccountCard.tsx`        | Presentación compartida de las páginas de cuenta.                   |

El envío de recuperación comienza después de responder `202` para evitar diferencias de tiempo según la existencia de la cuenta. No hay cola persistente ni reintentos automáticos: si el proceso termina durante el envío, se necesita una nueva solicitud. Un fallo de bienvenida conserva la cuenta creada; un fallo del correo de confirmación conserva la contraseña actualizada.
