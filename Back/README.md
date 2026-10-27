# Backend de InkManager

API con Express, TypeScript y Prisma. PostgreSQL en Supabase almacena datos, Cloudinary almacena imágenes y Resend envía correos. InkManager administra sus propios usuarios, roles y sesiones.

## Ejecución

Desde `Back/`, con `.env` configurado según `.env.example`:

```sh
npm ci
npm run db:generate
npm run dev
```

El servidor escucha en el puerto `4000`, configurable mediante `PORT`. El frontend local usa `http://127.0.0.1:3001`.

| Comando               | Función                                                      |
| --------------------- | ------------------------------------------------------------ |
| `npm run dev`         | Ejecuta el servidor y recarga cambios de `src/` y `.env`.    |
| `npm run build`       | Compila TypeScript en `dist/`.                               |
| `npm start`           | Ejecuta la compilación de producción.                        |
| `npm test`            | Ejecuta las pruebas automatizadas con proveedores simulados. |
| `npm run db:generate` | Genera el cliente Prisma a partir del esquema.               |

## Configuración

| Variables                                                              | Uso                                                     |
| ---------------------------------------------------------------------- | ------------------------------------------------------- |
| `DATABASE_URL`, `DIRECT_URL`                                           | Conexiones de PostgreSQL utilizadas por Prisma.         |
| `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`                            | Configuración del cliente privado de Supabase.          |
| `JWT_SECRET`                                                           | Clave privada de al menos 32 bytes para tokens propios. |
| `FRONTEND_URL`                                                         | Origen permitido y destino de los enlaces de cuenta.    |
| `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_REDIRECT_URI`      | Cliente OAuth y callback de Google.                     |
| `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET` | Almacenamiento de imágenes.                             |
| `MAIL_TRANSPORT`, `RESEND_API_KEY`, `MAIL_FROM`                        | Transporte, credencial y remitente de correo.           |

Las credenciales son privadas y los archivos `.env` están excluidos de Git. `prisma/schema.prisma` define el esquema de datos y `prisma/changes/` contiene los scripts SQL de la base.

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
