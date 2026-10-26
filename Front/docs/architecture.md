# Estructura y funcionamiento del frontend

El frontend usa Next.js App Router, React, TypeScript, Bootstrap y React Bootstrap. Las rutas se definen en `src/app/` y las secciones propias de cada página permanecen junto a ella.

## Carpetas

Las rutas de esta tabla parten de `Front/`.

| Carpeta                                  | Responsabilidad                                                           |
| ---------------------------------------- | ------------------------------------------------------------------------- |
| `src/app/`                               | Páginas, rutas, layout y estilos generales.                               |
| `src/app/estudios/`                      | Landing para artistas y estudios.                                         |
| `src/app/estudios/_components/`          | Secciones y estilos de esa landing.                                       |
| `src/app/clientes/`                      | Catálogo público para clientes.                                           |
| `src/app/clientes/_components/`          | Componentes propios del catálogo.                                         |
| `src/app/(auth)/`                        | Grupo de componentes y páginas de cuenta; no agrega un segmento a la URL. |
| `src/app/(auth)/Login/`                  | Modal de inicio de sesión.                                                |
| `src/app/(auth)/Register/`               | Modal de registro por público y rol.                                      |
| `src/app/(auth)/recuperar-contrasena/`   | Página para solicitar un enlace de contraseña.                            |
| `src/app/(auth)/restablecer-contrasena/` | Página para definir la nueva contraseña.                                  |
| `src/app/(auth)/verificar-email/`        | Página de confirmación del email.                                         |
| `src/app/dashboard/`                     | Carpeta reservada, sin página publicada.                                  |
| `src/components/`                        | Componentes compartidos entre páginas.                                    |
| `src/components/auth/`                   | Cabeceras, controles y presentación de cuenta.                            |
| `src/components/forms/`                  | Formularios y campos compartidos.                                         |
| `src/components/ui/`                     | Carpeta reservada para controles de interfaz.                             |
| `src/components/layout/`                 | Carpeta reservada para componentes de layout.                             |
| `src/hooks/`                             | Hooks de consulta y comportamiento de interfaz.                           |
| `src/lib/`                               | Cliente HTTP, validadores y funciones auxiliares.                         |
| `src/services/`                          | Llamadas al backend por funcionalidad.                                    |
| `src/store/`                             | Estado compartido de la aplicación.                                       |
| `src/types/`                             | Tipos e interfaces de TypeScript.                                         |
| `src/mocks/`                             | Datos de ejemplo del catálogo.                                            |
| `public/`                                | Recursos estáticos.                                                       |
| `public/images/`                         | Fotografías.                                                              |
| `public/fonts/`                          | Tipografías locales y licencias.                                          |
| `public/icons/`                          | Iconos y documentación de sus recursos.                                   |
| `docs/`                                  | Documentación técnica del frontend.                                       |

Las carpetas reservadas utilizan `.gitkeep` para conservarse en Git.

## Páginas y estilos

`src/app/layout.tsx` carga Bootstrap, tipografía, estilos globales y `AuthProvider`. La Home está en `src/app/page.tsx`; `/estudios` y `/clientes` tienen sus propias páginas.

La landing ordena las secciones en `src/app/estudios/page.tsx`. Cada componente de `_components/` representa una sección, y `landing.module.css` contiene sus estilos. Los archivos `.module.css` aíslan los nombres de clase. Las clases de Bootstrap aportan grilla, espaciado, tarjetas, modales y acordeón.

Los componentes que necesitan eventos, estado o APIs del navegador usan `'use client'`. `LandingHeader` controla el menú móvil. `useReducedMotion` consulta la preferencia de movimiento; las franjas y reseñas muestran una versión estática cuando está activada. React Fast Marquee mueve el contenido y lo pausa al pasar el cursor; la lista accesible evita repeticiones para lectores de pantalla.

## Reseñas

`ReviewsSection` utiliza `useReviews`, que consulta `reviews.service.ts` y `GET /api/resenas` mediante `apiFetch`. El tipo `Review` describe ID, nombre, foto y reseña. El hook conserva el resultado y cancela la petición al abandonar la página. La sección contempla carga, error y lista vacía.

Las reseñas proceden del backend y las fotos se sirven desde Cloudinary. Los datos del catálogo de `/clientes` proceden de `src/mocks/`.

## Sesión y registro

`AuthProvider` consulta `GET /api/auth/me` al cargar la aplicación y comparte el usuario de la sesión. El backend administra el token en una cookie HttpOnly; el frontend no lo guarda en localStorage.

`AuthControls` muestra login y registro, o el nombre, rol y cierre de sesión. `SiteHeader` lo usa en Home y clientes; `LandingHeader`, en estudios. Login y registro son modales, sin rutas `/login` ni `/registro`.

El contexto de registro es `cliente` en `/clientes`, `profesional` en `/estudios` y `general` en Home. `RegisterModal` presenta los campos correspondientes y `src/lib/registro.ts` define sus valores iniciales. El comportamiento por rol y el acceso con Google se describen en [registro y acceso](../../docs/registro-por-landing.md).

Formik administra los valores, errores y envío de formularios. `AuthField` conecta label, ID, autocompletado y validación, e incorpora el botón para mostrar u ocultar cada contraseña de forma independiente. `src/lib/auth-validation.ts` valida en el navegador; el backend valida nuevamente los datos.

`GoogleButton` comparte la apariencia entre login y registro. `GoogleAuthNotice` muestra avisos del callback y se monta dentro de `Suspense` porque consulta los parámetros de la URL.

## Recuperación de acceso

`AccountCard` presenta las páginas de cuenta. `RequestEmailForm` solicita enlaces, `ResetPasswordForm` permite definir la contraseña y `VerifyEmail` confirma el correo. Los enlaces llegan en el fragmento de la URL y se envían al backend al confirmar el formulario.

Los estilos de cuenta están en `src/components/auth/auth.module.css`. El envío y la persistencia de tokens pertenecen al backend; el frontend no conoce las claves de Resend. El flujo se describe en [correos y recuperación](../../docs/correos-y-recuperacion.md).

## Cliente HTTP y configuración

`src/lib/api-client.ts` define `apiFetch`, la URL del backend, inclusión de cookies, tiempo de espera y manejo de errores HTTP. Los archivos de `src/services/` convierten las respuestas en los datos de cada funcionalidad.

`Front/.env.local` configura `NEXT_PUBLIC_API_URL`. Las variables con prefijo `NEXT_PUBLIC_` son públicas y no contienen credenciales privadas. `.env.example` documenta las variables necesarias.
