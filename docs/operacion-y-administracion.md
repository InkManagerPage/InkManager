# Mensajes, recordatorios y administración

## Base de datos

Desde `Back`, ejecutar `npm run db:pagos` si el entorno todavía carece de las tablas de suscripciones. Ejecutar `npm run db:operacion` para instalar las tablas de mensajería, preferencias, entregas, avisos y auditoría. Ejecutar `npm run db:mensajes` para crear las tablas de conexiones y mensajes por canal. Después, aplicar `npm run db:instagram` para habilitar el inicio de sesión unificado. Para habilitar WhatsApp por estudio también se aplica `npm run db:whatsapp`. Ejecutar `npm run db:generate` para actualizar Prisma Client. Cada migración se aplica una vez por base.

## Bandeja de mensajes

**Mensajes** reúne las conversaciones por actividad, identifica el canal de cada hilo y permite filtrar por canal o por conversaciones sin leer. La API reúne los mensajes de Instagram y de WhatsApp cuando está configurado. Facebook y TikTok tienen lugar en el modelo de canales y requieren sus propios conectores para recibir y responder.

Los titulares y los artistas independientes administran sus conexiones. Los artistas del estudio ven los hilos vinculados a sus consultas asignadas mientras mantengan su acceso activo. El titular puede vincular un hilo a una consulta de su estudio. Desconectar una cuenta conserva el historial en la bandeja.

### Conectar Instagram

1. En la app de Meta de InkManager, crear una configuración de **API de Instagram con inicio de sesión unificado**. Requerir una cuenta profesional de Instagram y seleccionar `instagram_basic` e `instagram_manage_messages`. Elegir un token de usuario del sistema y guardar el identificador de configuración. Usar cuentas de prueba con rol en la app durante el desarrollo. [Inicio de sesión unificado de Meta](https://developers.facebook.com/documentation/instagram-platform/instagram-api-with-unified-login/get-started)
2. Registrar la URL HTTPS del frontend más `/api/mensajes/instagram/callback` como URI de redirección en **Business Login**. El backend arma esta URL con `FRONTEND_URL`; ambas deben coincidir exactamente.
3. En Webhooks, registrar la URL pública HTTPS del backend más `/api/webhooks/instagram` y suscribirse a `messages` del objeto `instagram`. Usar el mismo token de verificación que en el backend.
4. Habilitar el acceso a mensajes para herramientas conectadas en la cuenta profesional de Instagram. Luego, desde **Configuración → Cuentas asociadas → Conectar Instagram**, autorizar una sola cuenta profesional.

| Variable de backend | Valor |
| --- | --- |
| `INSTAGRAM_META_APP_ID` | Identificador de la app principal de Meta. |
| `INSTAGRAM_META_APP_SECRET` | Secreto de la app principal de Meta. El servidor lo usa para intercambiar el código y verificar las firmas del webhook. |
| `INSTAGRAM_CONFIG_ID` | Identificador de la configuración de inicio de sesión unificado. |
| `INSTAGRAM_VERIFY_TOKEN` | Cadena propia que se registra al verificar el webhook. |
| `INSTAGRAM_GRAPH_VERSION` | Versión de Graph API con formato `vNN.N`. |
| `INSTAGRAM_TOKEN_KEY` | Clave estable de cifrado de 32 bytes. Generarla con `node -e "console.log(require('node:crypto').randomBytes(32).toString('hex'))"`. |

Se guarda un perfil de Instagram por negocio. El token queda cifrado en el servidor y, si vence o se revoca, la pantalla permite autorizarlo otra vez. Las instalaciones con el inicio de sesión anterior pueden seguir usando `INSTAGRAM_APP_ID`, `INSTAGRAM_APP_SECRET` e `INSTAGRAM_WEBHOOK_SECRET`. La bandeja guarda DMs nuevos y muestra los mensajes enviados desde Instagram cuando Meta los entrega por webhook. Admite respuestas de texto dentro de la ventana de atención y señala cuando un mensaje contiene contenido multimedia.

### Bot de Instagram para consultas

Aplicar `npm run db:piloto-instagram` y `npm run db:asistente` y regenerar Prisma Client. Configurar `INSTAGRAM_BOT_ESTUDIO_SLUG` con el slug del estudio que participa, `FRONTEND_URL` con la URL pública y `GROQ_API_KEY` en el backend. El modelo predeterminado es `openai/gpt-oss-20b`. El estudio debe tener Instagram conectado con una autorización vigente. El bot responde únicamente a conversaciones entrantes de ese estudio. El cierre por plazo usa el programador de recordatorios o la actualización de la bandeja de consultas.

- En **Configuración → Asistente**, el titular puede importar, editar y descargar su JSON y simular mensajes. Con Groq configurado, el bot interpreta las consultas en lenguaje natural y responde con los servicios, políticas y preguntas frecuentes del negocio. Al pedir presupuesto, comparte un formulario por conversación que vence a las 24 horas y admite un único envío. Sin clave de Groq, el estudio piloto conserva los comandos anteriores.
- Al recibir el formulario, la consulta queda vinculada al DM. El backend confirma la recepción y comparte las propuestas vigentes si hay varias. El cliente responde con el código de la propuesta y el backend comprueba el estado y la vigencia antes de asignar.
- Cuando el cliente pide un turno o hablar con una persona, el bot avisa al titular y se pausa en ese hilo. El equipo coordina la fecha y la seña. **BOT** reanuda la asistencia automática.
- Las respuestas automáticas se envían dentro de las 24 horas desde el último mensaje del cliente. Al recibir otro DM se abre una ventana nueva para el seguimiento. Los estados de envío se ven en la bandeja. Durante el piloto las consultas web quedan a cargo del equipo.

## WhatsApp

El titular conecta su número de WhatsApp Business desde **Configuración → Cuentas asociadas → Conectar con Meta**. Cada estudio tiene un número y una cuenta de WhatsApp Business (WABA) propios. InkManager comparte una sola app de Meta para autorizar las conexiones mediante Embedded Signup.

### Configuración de InkManager en Meta

1. Crear la app de Meta con WhatsApp y Facebook Login for Business. Crear una configuración de **WhatsApp Embedded Signup** para Cloud API y copiar su identificador. Habilitar el inicio con el SDK de JavaScript y registrar el dominio HTTPS del frontend en los dominios permitidos. Para abrir el alta a estudios externos, completar la verificación, el acceso de Tech Provider y la revisión de permisos que indique Meta. [Implementación de Embedded Signup](https://developers.facebook.com/documentation/business-messaging/whatsapp/embedded-signup/implementation)
2. Configurar estas variables en el backend.

| Variable | Valor |
| --- | --- |
| `WHATSAPP_APP_ID` | Identificador de la app de InkManager en Meta. |
| `WHATSAPP_CONFIG_ID` | Identificador de Facebook Login for Business para Embedded Signup. |
| `WHATSAPP_APP_SECRET` | Secreto de la app de Meta que firma los webhooks. |
| `WHATSAPP_VERIFY_TOKEN` | Cadena propia que también se escribe al registrar el callback. |
| `WHATSAPP_GRAPH_VERSION` | Versión de Graph API usada por la app, con formato `vNN.N`. |
| `WHATSAPP_TOKEN_KEY` | Clave de cifrado estable de 32 bytes en hexadecimal. Generarla con `node -e "console.log(require('node:crypto').randomBytes(32).toString('hex'))"`. |

3. En Webhooks, usar la URL pública HTTPS del backend más `/api/webhooks/whatsapp` y el mismo token de verificación. Suscribirse a `messages` del objeto `whatsapp_business_account`. Para números elegibles de la app WhatsApp Business que se conecten en coexistencia, habilitar también `smb_message_echoes` para mostrar los mensajes nuevos enviados desde el teléfono. [WhatsApp Cloud API](https://www.postman.com/meta/whatsapp-business-platform/overview)

### Conexión de cada estudio

El titular autoriza la cuenta y el número en el asistente. InkManager verifica que ambos pertenezcan a la autorización, cifra el token y suscribe esa cuenta al webhook. Si Meta aún requiere registrar el número, el panel solicita el PIN de seis dígitos. Cuando el número ya está registrado para coexistencia, se usa su conexión existente. Para cobros de WhatsApp, el titular configura el medio de pago que corresponda en Meta.

El webhook valida la firma y comprueba el número y su WABA antes de guardar un mensaje en el estudio. El titular puede vincular cada hilo a una consulta y el artista asignado puede ver y responder ese hilo mientras tenga acceso activo al equipo. La bandeja admite texto dentro de la ventana de atención y señala los mensajes que contienen adjuntos. Empieza a registrar mensajes desde la conexión.

**Desconectar** elimina el token guardado y conserva el historial. Los permisos concedidos a la app se pueden retirar desde Meta. Si una autorización vence, el titular puede volver a conectar su número. Para el piloto anterior por variables de entorno se conservan `WHATSAPP_PHONE_NUMBER_ID`, `WHATSAPP_ACCESS_TOKEN` y uno de `WHATSAPP_ESTUDIO_ID` o `WHATSAPP_ARTISTA_ID`.

## Operación

El perfil y el plazo del estudio, los contactos, las reglas de recordatorios y las notificaciones se guardan en PostgreSQL. El correo del contacto identifica su ficha. Las excepciones se pueden editar por contacto o turno, con prioridad para la del turno.

Para activar el programador, configurar `RECORDATORIOS_AUTOMATICOS=1` en el backend. Usar `MAIL_TRANSPORT=preview` para ensayar en local. Para entrega real, configurar [Resend o Brevo](correos-y-recuperacion.md#transporte-y-configuración). Los grupos de correos se habilitan desde el panel de cada negocio. El mismo proceso revisa cierres de propuestas y avisos de renovación. El servidor debe permanecer en ejecución para procesar las tareas.

La bandeja de avisos registra mensajes nuevos, propuestas, asignaciones y cambios de turno. Las notificaciones de cuenta, registro y recuperación siguen su propio flujo de correo.

## Administración

`/admin` y `/api/admin` requieren el rol `SUPERADMIN`. Para habilitar una cuenta dedicada, registrarla como cliente, verificar el correo y ejecutar desde `Back`:

```powershell
npm.cmd run admin:habilitar -- correo@example.com
```

Volver a iniciar sesión con esa cuenta para acceder al panel. Las suspensiones revocan las sesiones activas. Las suspensiones, reactivaciones y cancelaciones quedan en el historial administrativo con el motivo indicado. Las métricas leen registros de la plataforma y separan cobros por moneda. La cancelación usa la suscripción seleccionada y, si corresponde, el proveedor Mercado Pago. El estado de una suscripción se verifica en `/suscripcion/resultado`.
