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
NEXT_PUBLIC_API_URL=http://127.0.0.1:4000/api
```

El frontend está disponible en [http://127.0.0.1:3001](http://127.0.0.1:3001). El backend debe estar activo para usar el acceso, los correos y las reseñas.

## Páginas

| Ruta                      | Función                                                               |
| ------------------------- | --------------------------------------------------------------------- |
| `/`                       | Home con entradas para clientes y profesionales.                      |
| `/estudios`               | Landing para artistas y estudios, con herramientas, reseñas y planes. |
| `/clientes`               | Catálogo público con datos de ejemplo.                                |
| `/recuperar-contrasena`   | Solicitar un enlace de contraseña por email.                          |
| `/restablecer-contrasena` | Crear o cambiar la contraseña desde un enlace.                        |
| `/verificar-email`        | Confirmar la dirección de correo.                                     |

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
