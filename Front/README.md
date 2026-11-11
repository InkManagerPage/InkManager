# Frontend de InkManager

Frontend con Next.js App Router, React, TypeScript, Bootstrap y React Bootstrap.

## Ejecución

Desde `Front/`:

```sh
npm ci
npm run dev
```

`Front/.env.local` configura la API. El archivo `.env.example` contiene la variable necesaria:

```dotenv
API_URL=http://127.0.0.1:4000/api
NEXT_PUBLIC_MERCADOPAGO_PUBLIC_KEY=
RESEND_API_KEY=
MAIL_FROM=
```

El frontend está disponible en [http://127.0.0.1:3000](http://127.0.0.1:3000). El backend debe estar activo para usar el acceso, los correos y las reseñas.

El formulario de contacto del pie de página envía mensajes a `inkmanagerpf2026@gmail.com` desde una acción de servidor de Next.js. Para habilitarlo, configura `RESEND_API_KEY` y `MAIL_FROM` también en `Front/.env.local` y en el entorno de despliegue del frontend, usando la clave y el remitente ya configurados en `Back/.env`. Next.js no carga automáticamente las variables del archivo del backend. No uses el prefijo `NEXT_PUBLIC_` para la clave; `MAIL_FROM` debe ser un remitente verificado en Resend.

## Checkout y suscripciones

`/checkout?plan=INDIVIDUAL&cycle=MENSUAL` y `cycle=ANUAL` permiten elegir suscripción
mensual recurrente o pago único anual de 12 meses. Los precios en ARS son Individual
$12.000/$120.000 y Estudio $35.000/$350.000 (mensual/anual). El checkout ofrece pago con
tarjeta tokenizada en el navegador o Checkout Pro para elegir entre los medios habilitados
por Mercado Pago. El backend nunca recibe PAN, vencimiento ni código de seguridad. Definí
`NEXT_PUBLIC_MERCADOPAGO_PUBLIC_KEY` con la clave pública de prueba o producción
correspondiente. El servidor calcula los importes definitivos desde las variables
`MP_PLAN_*` de `Back/.env`.

En Suscripción, el estado real de Mercado Pago incluye una opción temporal para cancelar
inmediatamente el plan y desactivar el acceso, sin reembolso automático. Una vez cancelado
se puede volver a elegir un plan. Se conserva el control existente de cancelación de renovación.

Las rutas `/checkout/success`, `/checkout/pending` y `/checkout/failure` consultan el
estado persistido de la suscripción antes de mostrar el resultado y esperan la
confirmación del webhook cuando el proveedor todavía informa un estado pendiente.

## Páginas

| Ruta                      | Función                                                               |
| ------------------------- | --------------------------------------------------------------------- |
| `/`                       | Home con entradas para clientes y profesionales.                      |
| `/estudios`               | Landing para artistas y estudios, con herramientas, reseñas y planes. |
| `/checkout`               | Checkout mensual/anual con tokenización en Mercado Pago.              |
| `/checkout/success`       | Confirmación de suscripción activa.                                   |
| `/checkout/pending`       | Consulta del estado mientras llega el webhook.                        |
| `/checkout/failure`       | Estado rechazado o cancelado.                                         |
| `/clientes`               | Catálogo público con datos de ejemplo.                                |
| `/recuperar-contrasena`   | Solicitar un enlace de contraseña por email.                          |
| `/restablecer-contrasena` | Crear o cambiar la contraseña desde un enlace.                        |
| `/verificar-email`        | Confirmar la dirección de correo.                                     |
| `/suscripcion`            | Redirige al checkout unificado de plan y frecuencia.                  |
| `/suscripcion/resultado`  | Consultar la confirmación asíncrona del pago.                         |
| `/suscripcion/cancelar`   | Cancelar desde el enlace seguro recibido por correo.                  |

Login y registro se abren en modales desde la cabecera. En clientes se registra el rol `CLIENTE`; en estudios se elige entre `ARTISTA` y `ESTUDIO_ADMIN`; en Home se elige primero el tipo de cuenta. Se puede acceder con contraseña o Google. El backend administra la sesión mediante una cookie HttpOnly y el frontend comparte sus datos con `AuthProvider`.

La landing incluye menú móvil, portada de pantalla completa, franja animada, acordeón, reseñas y tarjetas de planes. Los botones «Conocer más» no tienen navegación asociada. Las animaciones respetan la preferencia de movimiento reducido.

Las reseñas proceden de `GET /api/resenas` y muestran foto de Cloudinary, nombre y texto. Los perfiles de ejemplo se identifican como ficticios. La sección representa carga, error y lista vacía.

Las fotografías de portada y las tipografías se almacenan en `public/`. Las licencias y referencias de recursos se conservan junto a sus archivos.

## Organización

[La estructura del frontend](docs/architecture.md) describe las carpetas, componentes, estilos y consultas al backend. [Registro y acceso](../docs/registro-por-landing.md) documenta los roles y Google; [correos y recuperación](../docs/correos-y-recuperacion.md), las páginas y los enlaces de cuenta.

## Comandos

| Comando          | Función                                        |
| ---------------- | ---------------------------------------------- |
| `npm run dev`    | Ejecuta el servidor de desarrollo.             |
| `npm run format` | Aplica el formato del proyecto.                |
| `npm run check`  | Verifica código, formato, tipos y compilación. |
| `npm run build`  | Compila para producción.                       |
| `npm start`      | Ejecuta la compilación de producción.          |
