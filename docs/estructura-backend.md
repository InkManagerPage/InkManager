# Estructura del backend

El backend usa Express, TypeScript y Prisma. PostgreSQL en Supabase almacena los datos; Cloudinary almacena imágenes y Resend envía correos. La autenticación, los roles y las sesiones pertenecen al backend de InkManager.

## Organización

```text
Back/
├── src/
│   ├── auth/             # Login, logout, JWT y acceso con Google
│   ├── usuarios/         # Registro y persistencia de usuarios
│   ├── artistas/         # Edición del perfil del artista autenticado
│   ├── trabajos/         # Portafolio propio, borradores y publicación
│   ├── estilos/          # Lista común y validación de estilos
│   ├── catalogo/         # Consulta pública de artistas y trabajos publicados
│   ├── ubicaciones/      # Países, provincias y ciudades del catálogo geográfico
│   ├── sesiones/         # Creación, consulta y revocación de sesiones
│   ├── tokens-cuenta/    # Recuperación de contraseña y verificación de email
│   ├── correos/          # Plantillas, envío y errores de correo
│   ├── resenas/          # Reseñas públicas de artistas
│   ├── imagenes/         # Carga de imágenes en Cloudinary
│   ├── health/           # Estado del servidor
│   ├── config/           # Clientes y configuración de servicios
│   ├── middlewares/      # Sesión, roles, origen, límites y manejo de errores
│   ├── types/            # Tipos compartidos y extensiones de Express
│   ├── errors/           # Errores HTTP de la aplicación
│   ├── app.ts            # Configuración de Express y conexión de rutas
│   └── index.ts          # Inicio del servidor
├── prisma/               # Esquema, scripts SQL y datos de ejemplo
├── tests/                # Pruebas automatizadas
└── assets/               # Recursos utilizados por los datos de ejemplo
```

## Responsabilidades de las capas

| Archivo                    | Responsabilidad                                                           |
| -------------------------- | ------------------------------------------------------------------------- |
| `*.routes.ts`              | Define método y URL, y conecta middlewares con el controlador.            |
| `*.controller.ts`          | Lee la petición HTTP, llama al servicio y responde con estado y JSON.     |
| `*.service.ts`             | Aplica validaciones, reglas y coordinación entre operaciones.             |
| `*.repository.ts`          | Consulta o persiste datos mediante Prisma o el proveedor correspondiente. |
| `*.entity.ts`              | Describe los datos y tipos del módulo.                                    |
| `dto/` y `*.validation.ts` | Definen los datos de entrada y validan su contenido.                      |

El recorrido habitual es `ruta → controlador → servicio → repositorio → almacenamiento`. Los servicios no reciben `req` ni `res`. Los módulos sin persistencia propia, como `health` o el transporte de correos, contienen únicamente las capas que utilizan.

Los archivos `*.entity.ts` no crean tablas. Los modelos, relaciones y enumeraciones se definen en `prisma/schema.prisma`; Prisma genera los tipos usados por los repositorios. `prisma/changes/` contiene los scripts SQL de la base.

## Autenticación y sesiones

El registro admite `CLIENTE`, `ARTISTA` y `ESTUDIO_ADMIN`. El alta pública rechaza `SUPERADMIN`. Los artistas tienen nombre artístico; el alta de un estudio crea usuario, estudio y vínculo en una transacción.

Las contraseñas se almacenan como hashes bcrypt. Un login válido crea una fila `Sesion` y un JWT con `sub` para el usuario y `jti` para la sesión. La cookie `inkmanager_session` es HttpOnly, SameSite=Lax, dura una hora y usa Secure en producción. El JWT usa HS256, issuer `inkmanager-api` y audience `inkmanager-web`.

`requerirSesion` valida el token, la vigencia y revocación de la sesión, y consulta el usuario actual. `requerirRoles` compara su rol con los admitidos por cada ruta. El logout revoca la sesión actual y elimina su cookie; las otras sesiones permanecen activas. Restablecer una contraseña revoca todas las sesiones del usuario.

El acceso con Google valida identidad, state, nonce y PKCE, conserva el rol de una cuenta existente y genera la misma sesión propia. El flujo se describe en [registro y acceso](registro-por-landing.md).

## Endpoints

| Método y ruta                        | Función                                    | Módulo principal    |
| ------------------------------------ | ------------------------------------------ | ------------------- |
| `POST /api/auth/register`            | Alta general por rol                       | `usuarios`          |
| `POST /api/auth/register-artist`     | Alta con datos del perfil artístico        | `usuarios`          |
| `POST /api/auth/login`               | Login con email y contraseña               | `auth`              |
| `GET /api/auth/me`                   | Usuario de la sesión actual                | `auth` y `sesiones` |
| `POST /api/auth/logout`              | Cerrar la sesión actual                    | `auth` y `sesiones` |
| `GET /api/auth/google`               | Iniciar login con Google                   | `auth`              |
| `POST /api/auth/google/registro`     | Preparar registro con Google               | `auth`              |
| `GET /api/auth/google/callback`      | Validar respuesta de Google y abrir sesión | `auth`              |
| `POST /api/auth/forgot-password`     | Solicitar enlace de contraseña             | `tokens-cuenta`     |
| `POST /api/auth/reset-password`      | Crear o restablecer contraseña             | `tokens-cuenta`     |
| `POST /api/auth/resend-verification` | Solicitar verificación de email            | `tokens-cuenta`     |
| `POST /api/auth/verify-email`        | Confirmar email                            | `tokens-cuenta`     |
| `GET /api/auth/verify-email`         | Redirigir a la pantalla de confirmación    | `usuarios`          |
| `GET /api/resenas`                   | Consultar reseñas públicas                 | `resenas`           |
| `POST /api/upload`                   | Subir imagen con sesión válida             | `imagenes`          |
| `GET /api/health`                    | Consultar estado del servidor              | `health`            |
| `GET /api/estilos`                   | Consultar los estilos disponibles          | `estilos`           |
| `GET /api/catalogo`                  | Artistas y trabajos públicos               | `catalogo`          |
| `GET /api/auth/filter-artists`       | Filtrar perfiles públicos de artistas      | `usuarios`          |
| `GET /api/artistas/perfil`           | Consultar el perfil propio                 | `artistas`          |
| `PUT /api/artistas/perfil`           | Guardar perfil y foto                      | `artistas`          |
| `GET /api/trabajos`                  | Consultar el portafolio propio             | `trabajos`          |
| `POST /api/trabajos`                 | Crear un trabajo                           | `trabajos`          |
| `PATCH /api/trabajos/:id`            | Editar, publicar o pasar a borrador        | `trabajos`          |
| `DELETE /api/trabajos/:id`           | Eliminar trabajo y foto                    | `trabajos`          |

Los errores esperados usan `HttpError` y se devuelven como JSON. Los middlewares comprueban el origen de peticiones que modifican datos y traducen errores de JSON y Multer. El login tiene un límite de cinco intentos fallidos por cada quince minutos. Las respuestas de sesión utilizan `Cache-Control: no-store`.

## Reseñas e imágenes

El repositorio de reseñas selecciona artistas con foto y reseña. El servicio transforma `fotoPerfil` en `fotoUrl`; el controlador devuelve ID, nombre, foto y texto, sin datos privados. La consulta devuelve hasta veinte perfiles ordenados por nombre, un arreglo vacío si no hay resultados y HTTP 503 si falla el acceso a la base.

La carga de imágenes requiere sesión y acepta un único archivo `imagen` de tipo JPG, PNG o WebP, de hasta 2 MB. Cloudinary devuelve la referencia de la imagen almacenada.

## Perfil y portafolio del artista

`artistas` y `trabajos` requieren sesión con rol `ARTISTA`. El ID del propietario se obtiene de la sesión; las consultas y modificaciones de trabajos incluyen ese ID. Un trabajo ajeno responde 404. El catálogo público selecciona únicamente los campos públicos del artista y sus trabajos publicados.

El perfil utiliza `Usuario` y los trabajos utilizan `FotoGaleria`. Los estilos se validan contra una lista común, sin repositorio ni tabla propia. Las reglas y formatos de entrada están en [Panel del artista](panel-artista.md).

`ubicaciones` consulta un catálogo local de países, provincias y ciudades. Publica `GET /api/ubicaciones/paises`, `GET /api/ubicaciones/provincias?pais=AR` y `GET /api/ubicaciones/ciudades?pais=AR&provincia=3641`. El perfil guarda `ciudadId`; el backend obtiene la ciudad y el país del catálogo. El detalle y la atribución de los datos están en [Ubicaciones](ubicaciones.md).

## Correos y enlaces de cuenta

`tokens-cuenta` coordina los enlaces de verificación y contraseña; `correos` construye el contenido y lo entrega mediante Resend o una vista previa local. `TokenCuenta` almacena hashes de tokens, propósito, vencimiento y uso. El comportamiento y los endpoints se detallan en [correos y recuperación](correos-y-recuperacion.md).

## Pruebas

`npm test` ejecuta las pruebas de `Back/tests/`. La suite usa servidores HTTP temporales y simula Prisma, Cloudinary, Google y Resend. También comprueba validaciones y respuestas del cliente HTTP del frontend. No utiliza la base real ni envía correos a personas.
