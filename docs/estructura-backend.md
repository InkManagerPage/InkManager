# Estructura del backend

El backend usa Express y TypeScript. Está organizado por entidad o funcionalidad,
siguiendo la distribución del proyecto de ecommerce de referencia: cada carpeta
reúne su controlador, servicio, repositorio y entidad.

```text
Back/src/
├── usuarios/
│   ├── usuarios.controller.ts
│   ├── usuarios.service.ts
│   ├── usuarios.repository.ts
│   ├── usuarios.entity.ts
│   ├── usuarios.routes.ts
│   └── dto/
│       ├── registro-artista.dto.ts
│       └── registro-usuario.dto.ts
├── auth/
│   ├── auth.controller.ts
│   ├── auth.service.ts
│   ├── auth.routes.ts
│   ├── auth.tokens.ts
│   ├── auth.validation.ts
│   └── dto/login.dto.ts
├── resenas/
│   ├── resenas.controller.ts
│   ├── resenas.service.ts
│   ├── resenas.repository.ts
│   ├── resenas.entity.ts
│   └── resenas.routes.ts
├── imagenes/
│   ├── imagenes.controller.ts
│   ├── imagenes.service.ts
│   ├── imagenes.repository.ts
│   ├── imagenes.entity.ts
│   └── imagenes.routes.ts
├── health/
│   ├── health.controller.ts
│   └── health.routes.ts
├── config/
├── middlewares/
├── types/
├── errors/
├── app.ts
└── index.ts
```

Una petición recorre estas capas:

```text
Petición HTTP → Ruta → Controlador → Servicio → Repositorio → Base de datos / Cloudinary
```

La respuesta vuelve por el mismo camino hasta el controlador, que envía el JSON.

## Carpetas y archivos

| Ubicación dentro de Back | Responsabilidad |
| --- | --- |
| `src/index.ts` | Carga las variables de entorno y arranca el servidor. |
| `src/app.ts` | Configura Express, los middlewares generales y las rutas. No abre un puerto al importarlo. |
| `src/usuarios/` | Agrupa el registro general, el registro de artistas y la verificación de correo. |
| `src/auth/` | Valida las credenciales, genera JWT propios y expone el login con cookie HttpOnly. |
| `src/resenas/` | Agrupa los archivos de las reseñas que consume la landing. |
| `src/imagenes/` | Agrupa los archivos de la subida de imágenes a Cloudinary. |
| `src/health/` | Contiene la consulta del estado del servidor. |
| `*.routes.ts` | Declara las URLs y los métodos HTTP. Conecta cada endpoint con su controlador y sus middlewares. |
| `*.controller.ts` | Lee `req`, llama al servicio y responde con `res`: código HTTP y JSON. |
| `*.service.ts` | Contiene validaciones, reglas y preparación de datos. No utiliza `req` ni `res`. |
| `*.repository.ts` | Guarda y consulta datos. Aquí están las llamadas a Prisma y a Cloudinary. No toma decisiones HTTP. |
| `*.entity.ts` | Describe los datos de esa entidad o funcionalidad. |
| `usuarios/dto/` | Describe los datos de entrada del registro. Un DTO de TypeScript por sí solo no valida lo recibido. |
| `src/config/` | Configura los clientes de Prisma, Cloudinary y Supabase. Se reutilizan desde el resto del backend. |
| `src/middlewares/` | Procesa peticiones antes del controlador. Por ejemplo, Multer recibe el archivo de imagen. |
| `src/types/` | Describe la forma de los datos en TypeScript. Un tipo no valida por sí solo los datos recibidos. |
| `src/errors/` | Define errores esperados. `HttpError` permite comunicar un error de validación al controlador. |
| `prisma/schema.prisma` | Define los modelos, relaciones y enums que Prisma usa para trabajar con la base de datos. |
| `prisma/changes/` | Guarda los cambios SQL existentes. Reorganizar archivos no ejecuta estos scripts. |

Dentro de cada carpeta, los archivos tienen responsabilidades distintas. Usamos
funciones, sin clases base ni repositorios genéricos.

## Entidades y Prisma

La referencia usa archivos `*.module.ts` de NestJS y configuración de TypeORM.
InkManager conserva Express y Prisma: sus rutas se conectan en `app.ts` y cada
carpeta tiene un archivo `*.routes.ts`.

En `usuarios.entity.ts`, `Usuario` reutiliza el tipo que Prisma genera desde
`schema.prisma`. `UsuarioPublico` selecciona los campos que devuelve el registro,
sin contraseña ni token. El repositorio utiliza esos tipos para sus respuestas.

`resenas.entity.ts` describe la reseña pública, que actualmente se obtiene de un
perfil de artista. `imagenes.entity.ts` describe la referencia a una imagen de
Cloudinary. Estos archivos no crean tablas adicionales. Los cambios de tablas y
relaciones siguen definiéndose en `schema.prisma`.

## Endpoints existentes

| Método y ruta | Controlador | Servicio | Repositorio |
| --- | --- | --- | --- |
| `POST /api/auth/register` | `usuarios.controller.ts` | `usuarios.service.ts` | `usuarios.repository.ts` |
| `POST /api/auth/login` | `auth.controller.ts` | `auth.service.ts` | `usuarios.repository.ts` |
| `GET /api/auth/me` | `auth.controller.ts` | `auth.service.ts` | `usuarios.repository.ts` y `sesiones.repository.ts` |
| `POST /api/auth/logout` | `auth.controller.ts` | `auth.service.ts` | `sesiones.repository.ts` |
| `POST /api/auth/register-artist` | `usuarios.controller.ts` | `usuarios.service.ts` | `usuarios.repository.ts` |
| `GET /api/auth/verify-email` | `usuarios.controller.ts` | `usuarios.service.ts` | `usuarios.repository.ts` |
| `GET /api/resenas` | `resenas.controller.ts` | `resenas.service.ts` | `resenas.repository.ts` |
| `POST /api/upload` | `imagenes.controller.ts` | `imagenes.service.ts` | `imagenes.repository.ts` |
| `GET /api/health` | `health.controller.ts` | No necesita | No necesita |

`health` solo devuelve el estado del servidor. No consulta la base, por eso no le
agregamos un servicio ni un repositorio vacío.

Los endpoints de registro y verificación mantienen `/api/auth` en la URL para que
el frontend no tenga que cambiar. Sus archivos viven en `usuarios/` porque crean
y actualizan usuarios. El login está en su propia carpeta `auth/`.

## Ejemplo: consultar las reseñas

1. `app.ts` conecta `/api/resenas` con `resenas/resenas.routes.ts`.
2. La ruta `GET /` llama a `listarResenas` del controlador.
3. El controlador llama a `obtenerResenas` del servicio.
4. El servicio pide los artistas al repositorio.
5. El repositorio consulta Prisma, seleccionando solo los campos públicos.
6. El servicio transforma `fotoPerfil` en `fotoUrl`, como espera el frontend.
7. El controlador devuelve el arreglo como JSON o un error 503 si falla la consulta.

## Registro de artistas

El registro que ya existía sigue siendo el alta con datos del perfil del artista.
El servicio valida los campos obligatorios, revisa si el email está registrado,
genera el hash de la contraseña y prepara el token de verificación. El repositorio
guarda el usuario y devuelve únicamente los campos públicos seleccionados.

La contraseña y el token de verificación no se devuelven en la respuesta pública.
Generar el token no envía un correo: el envío de email todavía está pendiente.

## Estado de la rama autenticacion

El registro general crea clientes, artistas y administradores de estudio. Valida
los campos, normaliza el email, genera el hash bcrypt y devuelve campos públicos.
El alta de estudio guarda usuario, estudio y vínculo en una transacción.
El registro público rechaza `SUPERADMIN`.

El login devuelve `200` con los datos públicos y una cookie `inkmanager_session`
HttpOnly, SameSite=Lax, con duración de una hora y Secure en producción. El JWT
usa HS256, `sub` con el ID del usuario, issuer `inkmanager-api` y audience
`inkmanager-web`. No usa Supabase Auth ni su sistema de roles de aplicación.

Para ejecutar el backend, cada desarrollador debe agregar su propia `JWT_SECRET`
a `Back/.env`. Generar el valor con:

```sh
node -e "console.log(require('node:crypto').randomBytes(32).toString('hex'))"
```

La clave no se versiona. Después de cambiarla, reiniciar el backend. La URL del
frontend puede configurarse mediante `FRONTEND_URL`; por defecto se permiten
localhost:3001 y 127.0.0.1:3001.

Cada login crea una fila `Sesion`; su ID viaja en el claim `jti` del JWT.
`requerirSesion` verifica firma, algoritmo, vencimiento, issuer, audience, `sub` y `jti`.
Después consulta la sesión y el usuario actual: rechaza sesiones vencidas, revocadas,
ajenas o eliminadas. `GET /api/auth/me` devuelve los datos públicos del usuario.
`POST /api/auth/logout` revoca esa sesión en la base y elimina la cookie. Reutilizar
el token anterior ya no permite entrar; las otras sesiones del usuario siguen vigentes.

`requerirRoles` compara el rol actual de la base con los permitidos por cada ruta.
Upload admite los cuatro roles, con sesión obligatoria y antes de recibir el archivo.
Los recursos futuros de estudios, citas y solicitudes necesitarán además comprobar
su pertenencia al negocio. El rol por sí solo no concede acceso a otro estudio.

El login limita a cinco intentos fallidos por ventana de 15 minutos. Las respuestas
personales llevan `Cache-Control: no-store`. Se comprueba el origen de las peticiones
que modifican datos y los errores de JSON y Multer se traducen a respuestas JSON.
La Home y las dos páginas públicas comparten el estado de sesión y el logout.

El cambio de esquema para `Sesion` está en `prisma/changes/20261022_sesiones.sql`.
Las correcciones actuales no requieren nuevas migraciones. El envío de emails de
verificación y la integración con Google siguen pendientes.

## Comprobar el backend

Desde `Back/`:

```sh
npm run build
npm test
```

`Back/tests/endpoints.test.ts` levanta un servidor temporal y reemplaza las consultas
de Prisma y las subidas a Cloudinary con datos en memoria. Además configura una URL
local inválida para impedir conexiones accidentales a la base real.
`frontend-auth.test.ts` comprueba las validaciones y el cliente HTTP del frontend.
Se prueban registros, contraseñas, cookies, roles, sesiones, logout, archivos y errores.
