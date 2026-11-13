# Backend de InkManager

API con Express, TypeScript y Prisma. PostgreSQL en Supabase almacena datos, Cloudinary almacena imágenes y Resend envía correos. InkManager administra sus propios usuarios, roles y sesiones.

## Ejecución

Desde `Back/`, con `.env` configurado según `.env.example`:

```sh
npm ci
npm run db:generate
npm run dev
```

El servidor escucha en el puerto `4000`, configurable mediante `PORT`. El frontend local usa `http://127.0.0.1:3000`.

| Comando                     | Función                                                        |
| --------------------------- | -------------------------------------------------------------- |
| `npm run dev`               | Ejecuta el servidor y recarga cambios de `src/` y `.env`.      |
| `npm run build`             | Compila TypeScript en `dist/`.                                 |
| `npm start`                 | Ejecuta la compilación de producción.                          |
| `npm test`                  | Ejecuta las pruebas automatizadas con proveedores simulados.   |
| `npm run db:generate`       | Genera el cliente Prisma a partir del esquema.                 |
| `npm run db:pagos`          | Crea las tablas base necesarias para las suscripciones.        |
| `npm run db:pagos:unificar` | Integra el esquema de suscripciones con el checkout unificado. |

## Configuración

| Variables                                                              | Uso                                                                       |
| ---------------------------------------------------------------------- | ------------------------------------------------------------------------- |
| `DATABASE_URL`, `DIRECT_URL`                                           | Conexiones de PostgreSQL utilizadas por Prisma.                           |
| `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`                            | Configuración del cliente privado de Supabase.                            |
| `JWT_SECRET`                                                           | Clave privada de al menos 32 bytes para tokens propios.                   |
| `FRONTEND_URL`                                                         | Origen permitido y destino de los enlaces de cuenta.                      |
| `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_REDIRECT_URI`      | Cliente OAuth y callback de Google.                                       |
| `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET` | Almacenamiento de imágenes.                                               |
| `MAIL_TRANSPORT`, `RESEND_API_KEY`, `MAIL_FROM`                        | Transporte, credencial y remitente de correo.                             |
| `MERCADOPAGO_ACCESS_TOKEN`                                             | Token privado de Mercado Pago; usar credenciales de prueba en desarrollo. |
| `MERCADOPAGO_WEBHOOK_SECRET`                                           | Firma secreta para autenticar las notificaciones.                         |
| `MERCADOPAGO_WEBHOOK_URL`                                              | URL HTTPS pública del endpoint de notificaciones.                         |
| `MP_PLAN_INDIVIDUAL_MENSUAL_ARS`, `MP_PLAN_ESTUDIO_MENSUAL_ARS`        | Precios mensuales en ARS, calculados por el backend.                      |
| `MP_PLAN_INDIVIDUAL_ANUAL_ARS`, `MP_PLAN_ESTUDIO_ANUAL_ARS`            | Precios anuales en ARS, calculados por el backend.                        |

Las credenciales son privadas y los archivos `.env` están excluidos de Git. `prisma/schema.prisma` define el esquema de datos y `prisma/changes/` contiene los scripts SQL de la base.

## Suscripciones y pagos

Los planes se cobran mediante Mercado Pago: la opción mensual usa una suscripción recurrente y la anual es un pago único por 12 meses. El checkout alojado o el formulario seguro de Mercado Pago tokeniza la tarjeta en el navegador; InkManager no recibe ni almacena el número, vencimiento ni código de seguridad. El plan Individual cuesta ARS 12.000 por mes o ARS 120.000 por año; el plan Estudio cuesta ARS 35.000 por mes o ARS 350.000 por año.

En una base nueva, aplicá primero el esquema base y después la migración de unificación. En una base que ya tiene las tablas de suscripciones, aplicá solo la migración de unificación. Regenerá Prisma:

```sh
npm run db:pagos
npm run db:pagos:unificar
npm run db:generate
```

> Estos comandos modifican la base indicada por `DATABASE_URL`. Confirmá que apunte a staging/pruebas antes de ejecutarlos; no apliques migraciones para validar el flujo contra producción.

Configurá las variables `MERCADOPAGO_ACCESS_TOKEN` y `MERCADOPAGO_WEBHOOK_SECRET` con credenciales de prueba de una aplicación de Mercado Pago. `MERCADOPAGO_WEBHOOK_URL` debe apuntar por HTTPS a `https://<dominio-publico>/api/webhooks/mercadopago`; para desarrollo local necesitás un túnel HTTPS. En Mercado Pago habilitá **Pagos** y **Planes y suscripciones** (eventos `payment`, `subscription_preapproval` y `subscription_authorized_payment`) para sincronizar los cobros iniciales y las renovaciones. No uses credenciales de producción para las pruebas.

Con un vendedor de prueba podés configurar `MP_PLAN_INDIVIDUAL_MENSUAL_ARS=100` y `MP_PLAN_ESTUDIO_MENSUAL_ARS=100`, y `MP_PLAN_INDIVIDUAL_ANUAL_ARS=500` y `MP_PLAN_ESTUDIO_ANUAL_ARS=500`. Los nuevos intentos toman esos montos. Cancelá los intentos pendientes de un precio anterior antes de crear otros. En el mensual, usá el correo del comprador de prueba generado por Mercado Pago.

| Endpoint                                              | Acceso                           | Función                                                                       |
| ----------------------------------------------------- | -------------------------------- | ----------------------------------------------------------------------------- |
| `GET /api/pagos/planes`                               | Público                          | Devuelve los planes y precios configurados.                                   |
| `POST /api/pagos/crear-suscripcion`                   | Sesión ARTISTA o ESTUDIO_ADMIN   | Crea la suscripción mensual o el pago anual y devuelve checkout/token status. |
| `GET /api/pagos/suscripcion`                          | Sesión                           | Consulta el estado y ciclo de la última suscripción propia.                   |
| `POST /api/pagos/cancelar-suscripcion`                | Sesión propia o token del correo | Cancela renovaciones en Mercado Pago y conserva la fecha de período abonado.  |
| `POST /api/pagos/cancelar-suscripcion-inmediatamente` | Sesión ARTISTA o ESTUDIO_ADMIN   | Cancela el acceso inmediatamente para permitir una nueva contratación.        |
| `GET /api/pagos/suscripcion/:id`                      | Sesión propietaria               | Consulta el resultado individual del checkout.                                |
| `POST /api/pagos/suscripcion/:id/verificar`           | Sesión propietaria               | Si el mensual sigue pendiente, verifica su factura directamente en Mercado Pago. |
| `POST /api/webhooks/mercadopago`                      | Firma HMAC válida                | Actualiza suscripciones, pagos aprobados/rechazados y correos.                |

El correo de confirmación se envía al confirmarse un cobro y trae un enlace de cancelación de un solo uso, almacenado como hash y válido hasta el fin del período. Los correos de prueba con `MAIL_TRANSPORT=preview` se guardan en `Back/.mail-preview/`; para enviarlos por email real, configurá Resend. El backend revisa cada seis horas si hay renovaciones dentro de los próximos tres días y evita repetir avisos ya enviados.

### Prueba de integración

1. Usá una base de datos de staging/pruebas; aplicá la migración anterior.
2. Completá las variables de Mercado Pago con credenciales de prueba y levantá el backend, el frontend y el túnel HTTPS.
3. Creá una cuenta ARTISTA para probar Individual o ESTUDIO_ADMIN para Estudio. Desde `/estudios#planes`, elegí plan y ciclo.
4. Completá el checkout con un usuario y medio de pago de prueba de Mercado Pago. El plan se activa cuando el servidor confirma el cobro con Mercado Pago. Si el mensual sigue pendiente, el regreso del checkout o el botón **Verificar pago** consultan la factura.
5. Revisá `GET /api/pagos/suscripcion` y `Back/.mail-preview/` para verificar estado, monto y correo en modo preview.
6. Abrí el enlace de cancelación recibido y confirmá la acción. Verificá en Mercado Pago que la suscripción no renueve y en la respuesta/base que `periodoHasta` se conserva.
7. Probá un medio de pago rechazado y verificá el estado `VENCIDA` y el email de alerta. Usá las herramientas de prueba de Webhooks de Mercado Pago para validar los eventos.

La aplicación todavía no aplica restricciones de acceso a funcionalidades según el plan; la integración registra y administra el estado de suscripción, pero las reglas de qué funciones quedan detrás de cada plan deben definirse antes de activar esa limitación.

## Funcionalidades

- Registro de clientes, artistas y administradores de estudio.
- Login con contraseña y Google, consulta de usuario y cierre de sesión.
- Sesiones persistidas y permisos según el rol actual.
- Bienvenida, verificación de email y recuperación de contraseña por correo.
- Carga autenticada de imágenes en Cloudinary.
- Consulta pública de reseñas de artistas.
- Perfil privado del artista y portafolio con borradores y publicación manual.
- Catálogo público de artistas completos y trabajos publicados, con estilos comunes.

La [estructura del backend](../docs/estructura-backend.md) documenta las capas, módulos y endpoints. [Registro y acceso](../docs/registro-por-landing.md) describe los roles y Google; [correos y recuperación](../docs/correos-y-recuperacion.md), el envío y los enlaces de cuenta.

El [panel del artista](../docs/panel-artista.md) documenta perfil, portafolio y visibilidad pública. En una base que aún no tenga estas columnas, su esquema se aplica desde `Back/` con:

```sh
npx prisma db execute --file prisma/changes/20261026_panel_artista.sql --schema prisma/schema.prisma
npx prisma db execute --file prisma/changes/20261027_ciudad_validada.sql --schema prisma/schema.prisma
npm run db:generate
```

## Imágenes y reseñas

`POST /api/upload` requiere sesión y recibe un único archivo `imagen` por multipart: JPG, PNG o WebP, de hasta 2 MB. Responde `401` sin sesión, `400` ante datos inválidos y `413` si supera el límite.

`GET /api/resenas` devuelve hasta veinte artistas con foto y reseña, ordenados por nombre. Cada elemento contiene `id`, `nombre`, `fotoUrl` y `resena`. No expone email, contraseña ni documentos. Una lista sin resultados devuelve `[]`; un error de base devuelve `503`.

## Datos de ejemplo

`prisma/review-artists.ts` define perfiles ficticios. `prisma/seed-reviews.ts` sube los retratos de `assets/portraits/` a Cloudinary y guarda las URLs y reseñas. Identifica usuarios por email e imágenes por ID fijo para evitar duplicados. Los perfiles nuevos reciben un hash bcrypt de un valor aleatorio; no se guarda ni se comparte una contraseña de acceso.

| Comando                | Función                                            |
| ---------------------- | -------------------------------------------------- |
| `npm run db:reviews`   | Aplica las columnas de foto y reseña si faltan.    |
| `npm run db:security`  | Aplica las reglas RLS del script de seguridad.     |
| `npm run seed:reviews` | Carga los perfiles, retratos y reseñas de ejemplo. |

`prisma/seed.ts` reemplaza datos de tablas; `seed:reviews` es independiente y conserva los usuarios existentes.

`npm run seed:catalogo` agrega 8 artistas ficticios, 2 estudios y 16 trabajos publicados para probar estilos, ubicación y artistas independientes o de estudio. Usa ciudades del catálogo y sube a Cloudinary las imágenes que ya están en el repositorio. Las fotos se reutilizan como material de prueba y no representan trabajos reales de esos perfiles. Los correos `catalogo-demo-*@example.test` están reservados para estos datos; no tienen contraseña ni acceso con Google.

La carga es repetible y conserva las cuentas existentes. `npm run seed:catalogo -- --remove` elimina exclusivamente estos perfiles, los estudios de prueba que hayan quedado vacíos y sus imágenes de Cloudinary. No usa el seed general que vacía tablas.

La configuración de autenticación en producción está en [Despliegue](../docs/despliegue.md).
