# Estructura y funcionamiento del frontend

El frontend usa Next.js App Router, React, TypeScript, Bootstrap y React Bootstrap. Las rutas se definen en `src/app/` y las secciones propias de cada página permanecen junto a ella.

## Carpetas

Las rutas de esta tabla parten de `Front/`.

| Carpeta                                  | Responsabilidad                                                               |
| ---------------------------------------- | ----------------------------------------------------------------------------- |
| `src/app/`                               | Páginas, rutas, layout y estilos generales.                                   |
| `src/app/estudios/`                      | Landing para artistas y estudios.                                             |
| `src/app/estudios/_components/`          | Secciones y estilos de esa landing.                                           |
| `src/app/clientes/`                      | Catálogo público para clientes.                                               |
| `src/app/clientes/_components/`          | Componentes propios del catálogo.                                             |
| `src/app/estudio/`                       | Panel privado del titular del estudio y gestión del equipo.                   |
| `src/components/panel/`                  | Formularios, estilos y vistas de gestión compartidos entre artista y estudio. |
| `src/app/artista/`                       | Panel privado: actividad, estadísticas y gestión del artista.                 |
| `src/app/artista/_components/`           | Vistas, navegación, galería y formularios del artista.                        |
| `src/app/(auth)/`                        | Grupo de componentes y páginas de cuenta; no agrega un segmento a la URL.     |
| `src/app/(auth)/Login/`                  | Modal de inicio de sesión.                                                    |
| `src/app/(auth)/Register/`               | Modal de registro por público y rol.                                          |
| `src/app/(auth)/recuperar-contrasena/`   | Página para solicitar un enlace de contraseña.                                |
| `src/app/(auth)/restablecer-contrasena/` | Página para definir la nueva contraseña.                                      |
| `src/app/(auth)/verificar-email/`        | Página de confirmación del email.                                             |
| `src/app/dashboard/`                     | Carpeta reservada, sin página publicada.                                      |
| `src/components/`                        | Componentes compartidos entre páginas.                                        |
| `src/components/auth/`                   | Cabeceras, controles y presentación de cuenta.                                |
| `src/components/forms/`                  | Formularios y campos compartidos.                                             |
| `src/components/ui/`                     | Carpeta reservada para controles de interfaz.                                 |
| `src/components/layout/`                 | Carpeta reservada para componentes de layout.                                 |
| `src/hooks/`                             | Hooks de consulta y comportamiento de interfaz.                               |
| `src/lib/`                               | Cliente HTTP, validadores y funciones auxiliares.                             |
| `src/services/`                          | Llamadas al backend por funcionalidad.                                        |
| `src/store/`                             | Estado compartido de la aplicación.                                           |
| `src/types/`                             | Tipos e interfaces de TypeScript.                                             |
| `src/mocks/`                             | Datos de ejemplo del catálogo.                                                |
| `public/`                                | Recursos estáticos.                                                           |
| `public/images/`                         | Fotografías.                                                                  |
| `public/fonts/`                          | Tipografías locales y licencias.                                              |
| `public/icons/`                          | Iconos y documentación de sus recursos.                                       |
| `docs/`                                  | Documentación técnica del frontend.                                           |

Las carpetas reservadas utilizan `.gitkeep` para conservarse en Git.

## Páginas y estilos

`src/app/layout.tsx` carga Bootstrap, tipografía, estilos globales, `UnsavedChangesProvider` y `AuthProvider`. La Home está en `src/app/page.tsx`; `/estudios` y `/clientes` tienen sus propias páginas.

La landing ordena las secciones en `src/app/estudios/page.tsx`. Cada componente de `_components/` representa una sección, y `landing.module.css` contiene sus estilos. Los archivos `.module.css` aíslan los nombres de clase. Las clases de Bootstrap aportan grilla, espaciado, tarjetas, modales y acordeón.

Los componentes que necesitan eventos, estado o APIs del navegador usan `'use client'`. `LandingHeader` controla el menú móvil. `useReducedMotion` consulta la preferencia de movimiento; las franjas y reseñas muestran una versión estática cuando está activada. React Fast Marquee mueve el contenido y lo pausa al pasar el cursor; la lista accesible evita repeticiones para lectores de pantalla.

## Reseñas

`ReviewsSection` utiliza `useReviews`, que consulta `reviews.service.ts` y `GET /api/resenas` mediante `apiFetch`. El tipo `Review` describe ID, nombre, foto y reseña. El hook conserva el resultado y cancela la petición al abandonar la página. La sección contempla carga, error y lista vacía.

Las reseñas proceden del backend y las fotos se sirven desde Cloudinary. En `/clientes`, la galería de trabajos procede de `GET /api/catalogo`. Al seleccionar una foto, un modal de React Bootstrap presenta el trabajo y los datos públicos de su artista. Los filtros comparten la lista de estilos del backend.

## Panel del artista

`ArtistShell` conserva la validación de sesión y rol, compone la navegación y monta los contextos del panel. `ArtistProfileProvider` administra el perfil conectado al backend. `ConsultasProvider` obtiene consultas, contactos, equipo y turnos de la API. `ArtistPanelProvider` combina esa fuente con las preferencias, mensajes, notificaciones, reglas generales de recordatorios y suscripción que todavía se conservan por usuario en localStorage.

Las vistas están divididas en `ArtistOverview`, `ArtistStatistics`, `ArtistQueries`, `ArtistAgenda`, `ArtistClients`, `ArtistMessages`, `ArtistStudio`, `ArtistNotifications`, `ArtistSettings`, `ArtistReminders` y `ArtistSubscription`. `ArtistOverview` organiza la actividad pendiente y `ArtistStatistics` muestra las métricas mensuales calculadas por `lib/estadisticas-artista.ts`. `ReminderOverrides` comparte los ajustes de correo por cliente y sesión. `PanelUI` comparte iconos, encabezados, avatares, búsquedas y estados. `shell.module.css` define la navegación y `workspace.module.css` los elementos comunes; estadísticas, agenda, mensajes, recordatorios y suscripción tienen sus estilos propios. `panel.module.css` queda reservado a los formularios de perfil y portafolio.

`types/panel-artista.ts` define los contratos de las vistas. Los antiguos mocks de gestión se conservan para las pruebas de funciones; no inicializan las consultas, personas ni turnos de los paneles. `lib/panel-artista.ts` contiene fechas, importes y validaciones de agenda y presupuestos. Las páginas que consultan parámetros de la URL contienen sus vistas en `Suspense`.

Los contratos de correo y facturación están en `types/recordatorios.ts` y `types/suscripcion.ts`. `lib/recordatorios.ts` valida reglas, resuelve excepciones y sustituye variables; `lib/canales-consulta.ts` agrupa los canales de recepción. `lib/panel-storage.ts` migra los datos locales sin eliminar cambios previos. La configuración de recordatorios y suscripción no realiza envíos ni transacciones externas.

`ArtistShell` comprueba la sesión y el rol antes de montar las pantallas. Su menú lateral se puede ocultar y la cabecera muestra nombre y email de la cuenta. `ArtistProfileProvider` comparte el perfil entre la navegación y el formulario para actualizar el indicador de campos pendientes al guardar. `WorkGallery` administra la lista y los estados de publicación; `WorkForm` edita un trabajo en un modal de React Bootstrap. `ProfileEditor` permite completar el perfil. `PhotoField` y `StylePicker` se comparten entre ambos formularios. `lib/comprimir-imagen.ts` prepara las imágenes antes de enviarlas. Los estilos propios del panel están en `panel.module.css`.

`artistas.service.ts` realiza las peticiones privadas con cookies de sesión; `catalogo.service.ts` consulta los datos públicos sin caché. Los contratos están en `types/artista.ts`. Las reglas del perfil y de publicación se describen en [Panel del artista](../../docs/panel-artista.md).

`LocationFields` presenta selectores dependientes de país, provincia y ciudad. Consulta las opciones mediante `ubicaciones.service.ts`, descarta respuestas de selecciones anteriores y recuerda el país en `localStorage`. El perfil envía el ID de ciudad, que se valida en el backend.

## Formularios del panel

`PanelForm` comparte Formik, validación por campo, estado de envío y foco del primer error. `PanelField` utiliza controles y mensajes de React Bootstrap. `UnsavedChangesProvider` y `useUnsavedChanges` registran formularios modificados y presentan la confirmación de descarte mediante Bootstrap; `nextjs-nav-guard` protege enlaces, router, Atrás y salida de la página. Se monta antes de la carga de autenticación para cubrir la navegación del navegador.

`usePanelFilters` conserva filtros y detalles en la URL sin eliminar los parámetros existentes. `useMediaQuery` adapta la vista inicial de Agenda sin alterar una vista elegida explícitamente. `erroresCita`, `erroresPresupuesto`, `erroresCliente` y `erroresReglaCorreo` producen errores por campo; sus validadores de texto conservan compatibilidad con las acciones del estado de gestión.

## Sesión y registro

`AuthProvider` consulta `GET /api/auth/me` al cargar la aplicación y comparte el usuario de la sesión. El backend administra el token en una cookie HttpOnly; el frontend no lo guarda en localStorage.

`AuthControls` muestra login y registro, o el nombre, rol y cierre de sesión. `SiteHeader` lo usa en Home y clientes; `LandingHeader`, en estudios. Login y registro son modales, sin rutas `/login` ni `/registro`.

El contexto de registro es `cliente` en `/clientes`, `profesional` en `/estudios` y `general` en Home. `RegisterModal` presenta los campos correspondientes y `src/lib/registro.ts` define sus valores iniciales. El comportamiento por rol y el acceso con Google se describen en [registro y acceso](../../docs/registro-por-landing.md).

Formik administra los valores, errores y envío de formularios. `AuthField` conecta label, ID, autocompletado y validación, e incorpora el botón para mostrar u ocultar cada contraseña de forma independiente. `src/lib/auth-validation.ts` valida en el navegador; el backend valida nuevamente los datos.

El nombre personal admite solo letras y espacios entre 2 y 20 caracteres. `validarNuevaPassword` comparte las reglas de contraseña entre registro y recuperación: mínimo 9 caracteres, mayúscula, número, símbolo y máximo 72 bytes. El login admite contraseñas existentes y valida presencia y límite de bytes.

`GoogleButton` comparte la apariencia entre login y registro. `GoogleAuthNotice` muestra avisos del callback y se monta dentro de `Suspense` porque consulta los parámetros de la URL.

## Recuperación de acceso

`AccountCard` presenta las páginas de cuenta. `RequestEmailForm` solicita enlaces, `ResetPasswordForm` permite definir la contraseña y `VerifyEmail` confirma el correo. Los enlaces llegan en el fragmento de la URL y se envían al backend al confirmar el formulario.

Los estilos de cuenta están en `src/components/auth/auth.module.css`. El envío y la persistencia de tokens de cuenta pertenecen al backend. El formulario público del pie de página usa una acción de servidor de Next.js y Resend, con `RESEND_API_KEY` y `MAIL_FROM` configurados en el entorno del frontend; la clave nunca se envía al navegador. El flujo de cuenta se describe en [correos y recuperación](../../docs/correos-y-recuperacion.md).

## Cliente HTTP y configuración

`src/lib/api-client.ts` define `apiFetch`, la URL del backend, inclusión de cookies, tiempo de espera y manejo de errores HTTP. Los archivos de `src/services/` convierten las respuestas en los datos de cada funcionalidad.

El navegador consulta `/api` en el mismo dominio de la página. `next.config.ts` reenvía esas peticiones al backend, incluyendo las cookies y las respuestas de Google. Esto permite usar una cookie HttpOnly con `SameSite=Lax` aunque frontend y backend estén alojados en proveedores distintos.

`Front/.env.local` configura `API_URL`, la URL absoluta del backend con `/api`, además de `RESEND_API_KEY` y `MAIL_FROM` para la acción de contacto. Las consultas desde el servidor también usan esa dirección. Se admite `NEXT_PUBLIC_API_URL` como alternativa para instalaciones anteriores, pero el navegador siempre usa `/api`. La configuración de producción está en [Despliegue](../../docs/despliegue.md).

## Panel del estudio

`/estudio` utiliza `StudioShell` y `StudioProvider`. Los tipos, datos locales y reglas están en `types/panel-estudio.ts`, `mocks/panel-estudio.ts` y `lib/panel-estudio.ts`. La documentación funcional se encuentra en `docs/panel-estudio.md` de la raíz. Los componentes de `components/panel/` reciben datos y acciones; no dependen de un proveedor específico de rol.

## Consultas compartidas

`store/ConsultasProvider.tsx` es la fuente de consultas, contactos, equipo y turnos, obtenidos de `services/consultas.service.ts`. Las escrituras de turnos usan `services/citas.service.ts`; `types/citas.ts` define sus contratos y `lib/agenda.ts` valida el formulario y convierte fechas del negocio. Se monta una vez en cada panel. `components/panel/ConsultationsWorkspace.tsx` presenta las consultas de estudio y artista, y `WorkspaceDirectory.tsx` enlaza contactos e integrantes con sus consultas y turnos. `AgendaWorkspace.tsx` comparte las vistas y la edición de agenda para ambos roles. Los providers de los paneles toman esa fuente para sus resúmenes; las funciones todavía locales se inicializan sin las personas y proyectos de los mocks anteriores. La documentación de contratos y permisos está en `docs/consultas-y-propuestas.md` de la raíz.

## Equipo e invitaciones

`TeamWorkspace` y `InvitationList` comparten la gestión de integrantes y las invitaciones entre los dos paneles. `types/equipo.ts` define integrantes guardados, versiones e invitaciones, y `services/equipo.service.ts` realiza las escrituras. `ConsultasProvider` incluye estos datos y los actualiza tras las acciones. La página pública `/invitacion-equipo` orienta el acceso desde el correo; la aceptación requiere una cuenta de artista con el email verificado. Los contratos y las reglas están en `docs/equipo-estudio.md` de la raíz.
