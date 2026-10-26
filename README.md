# InkManager

Aplicación para conectar clientes con artistas y estudios de tatuajes. Incluye páginas públicas, registro por tipo de cuenta, acceso con contraseña y Google, sesiones propias, carga de imágenes, reseñas y correos de cuenta.

## Estructura

| Carpeta  | Contenido                                             |
| -------- | ----------------------------------------------------- |
| `Front/` | Aplicación Next.js con React, TypeScript y Bootstrap. |
| `Back/`  | API Express con TypeScript y Prisma.                  |
| `docs/`  | Documentación del funcionamiento y la arquitectura.   |

PostgreSQL en Supabase almacena los datos. Cloudinary almacena las imágenes y Resend envía correos. InkManager administra la autenticación y los roles de la aplicación.

## Documentación

- [Frontend: ejecución y páginas](Front/README.md).
- [Estructura del frontend](Front/docs/architecture.md).
- [Backend: ejecución y configuración](Back/README.md).
- [Estructura y endpoints del backend](docs/estructura-backend.md).
- [Registro y acceso con Google](docs/registro-por-landing.md).
- [Correos y recuperación de acceso](docs/correos-y-recuperacion.md).
