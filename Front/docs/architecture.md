# Guía de carpetas y código

## Por dónde empezar a leer

1. `src/app/layout.tsx` carga Bootstrap, la tipografía y los estilos generales. Envuelve todas las páginas.
2. `src/app/page.tsx` muestra la Home con entradas para clientes y para artistas o estudios.
3. `src/app/estudios/page.tsx` muestra las secciones de la landing en orden.
4. Cada archivo de `src/app/estudios/_components/` contiene una de esas secciones.
5. `landing.module.css`, en esa misma carpeta, define su apariencia.

Un componente es una función que devuelve una parte de la página. Por ejemplo, `Hero()` devuelve la portada. En `page.tsx`, escribir `<Hero />` coloca esa portada en la página.

## Qué hace cada carpeta

Las rutas de esta tabla parten de `Front/`.

| Carpeta                         | Qué guardar allí                                                          |
| ------------------------------- | ------------------------------------------------------------------------- |
| `src/`                          | Todo el código de la aplicación                                           |
| `src/app/`                      | Páginas, rutas y estructura común de Next.js                              |
| `src/app/estudios/`             | La página `/estudios`, con la landing para tatuadores                     |
| `src/app/estudios/_components/` | Secciones que solo se usan en esa landing                                 |
| `src/app/clientes/`             | Catálogo de estudios y artistas con datos de ejemplo                      |
| `src/app/clientes/_components/` | Secciones propias de la futura landing de clientes                        |
| `src/app/(auth)/`               | Agrupar las futuras páginas de acceso. `(auth)` no forma parte de la URL  |
| `src/app/(auth)/Login/`         | Modal de inicio de sesión                                                 |
| `src/app/(auth)/Register/`      | Modal de registro básico por rol                                          |
| `src/app/dashboard/`            | Reservada para el área privada. Más adelante necesitará control de acceso |
| `src/components/`               | Componentes que se usen en más de una página                              |
| `src/components/ui/`            | Controles pequeños compartidos, como botones o campos de texto            |
| `src/components/forms/`         | Formularios completos que se puedan reutilizar                            |
| `src/components/auth/`          | Cabecera, controles de cuenta y estilos de acceso compartidos             |
| `src/components/layout/`        | Cabeceras, pies y otras partes comunes a varias páginas                   |
| `src/hooks/`                    | Funciones de React que reúnen comportamiento reutilizable                 |
| `src/lib/`                      | Configuración y funciones de conexión con herramientas externas           |
| `src/services/`                 | Llamadas al backend, agrupadas por tema                                   |
| `src/store/`                    | Datos que varias partes de la aplicación necesiten compartir              |
| `src/types/`                    | Tipos de TypeScript que se usen en varios archivos                        |
| `public/`                       | Archivos que el navegador puede abrir directamente                        |
| `public/images/`                | Fotografías e imágenes                                                    |
| `public/fonts/`                 | Tipografías locales y sus licencias                                       |
| `public/icons/`                 | Iconos guardados como archivos                                            |
| `docs/`                         | Explicaciones para quienes trabajen en el proyecto                        |

Las carpetas reservadas contienen un `.gitkeep` vacío para que Git las conserve. No hace falta llenarlas hasta que las necesitemos.

## Cómo leer la landing

### Datos y listas

En `PlansSection.tsx`, `plans` es una lista con los datos de los planes. Cada plan tiene `name` (nombre), `description` (descripción) y `features` (prestaciones). Para editar esos textos, cambiá la lista del principio del archivo.

`plans.map(...)` recorre esa lista y crea una tarjeta por cada plan. Dentro de cada tarjeta, `plan.features.map(...)` crea un elemento por prestación. `key` permite que React identifique cada elemento de la lista.

`ToolsSection.tsx`, `Marquee.tsx` y `ReviewsSection.tsx` usan la misma idea: una lista de datos y un `map` para mostrarlos. En las reseñas, la lista llega del backend en vez de estar escrita en el componente.

El recorrido de las reseñas es: `ReviewsSection.tsx` usa `useReviews.ts`; el hook llama a `reviews.service.ts`, que consulta `GET /api/resenas` mediante `api-client.ts`. El tipo `Review`, en `src/types/review.ts`, describe los cuatro datos recibidos: ID, nombre, URL de la foto y reseña. El hook guarda el resultado y cancela la petición cuando se abandona la página. El componente muestra los estados de carga, error y lista vacía.

### Clases de Bootstrap y estilos propios

En `className="col-md-6"`, la clase viene de Bootstrap: ocupa media fila desde el tamaño mediano y toda la fila en celulares. `row` crea una fila, `g-4` agrega separación y `text-center` centra el texto.

En `className={styles.plan}`, la clase viene de `landing.module.css`. Un archivo `.module.css` mantiene sus clases separadas de las de otras páginas. Para combinar una clase de Bootstrap con una propia se usan acentos graves y `${styles.nombreDeClase}`, como en las tarjetas de planes.

`:global(.accordion-button)` dentro del CSS permite modificar una clase que crea Bootstrap. Los bloques `@media` ajustan la apariencia según el ancho de pantalla.

### Interacción

`'use client'` al principio de un archivo permite usar eventos, estado y funciones del navegador. Lo necesitan el menú, el acordeón, la franja animada y las reseñas. Las demás secciones solo muestran contenido.

En `LandingHeader.tsx`, `menuAbierto` guarda si el menú del celular está abierto. `setMenuAbierto` cambia ese valor y `cerrarMenu()` lo pone en `false` cuando se elige un enlace.

`useReducedMotion.ts` consulta si la persona prefiere menos animaciones. Usa `useSyncExternalStore`, una función de React para leer un valor externo y actualizarlo cuando cambia. `Marquee.tsx` y `ReviewsSection.tsx` usan ese resultado para elegir entre contenido quieto o en movimiento.

En `ReviewsSection.tsx`, React Fast Marquee desplaza las tarjetas y las pausa al pasar el cursor. La versión animada repite tarjetas para completar el recorrido; los lectores de pantalla reciben una lista sin repeticiones.

## Acceso y registro

`src/store/AuthProvider.tsx` comparte el usuario de la sesión entre las páginas.
Al cargar la aplicación consulta `GET /api/auth/me`. El token permanece en una cookie
HttpOnly que administra el backend; no se guarda en localStorage.

`src/components/auth/AuthControls.tsx` muestra los accesos o el nombre, rol y botón de
cierre de sesión. `SiteHeader.tsx` lo usa en Home y clientes; `LandingHeader.tsx`, en estudios.
Los modales están en `src/app/(auth)/Login/Login.tsx` y `Register/Register.tsx`.
Son componentes, todavía no son páginas `/login` y `/registro`.

Cada cabecera indica un `contextoRegistro`: `cliente` en `/clientes`, `profesional`
en `/estudios` y `general` en la Home. `AuthControls.tsx` lo pasa al modal.
En clientes se usa `CLIENTE` sin mostrar un selector. En profesionales solo se
elige Artista o Estudio. En la Home primero se pregunta para qué se quiere usar
InkManager. `src/lib/registro.ts` prepara los valores iniciales de cada formulario.

El registro pide nombre, email, contraseña y confirmación. El rol artista agrega
nombre artístico; estudio agrega nombre del estudio. Los datos de perfil, documentos
y tarifas quedan fuera del alta inicial. `users.service.ts` envía únicamente los datos
que acepta `POST /api/auth/register`; al terminar se intenta iniciar sesión.
Si el alta funciona y el login falla, se informa que la cuenta ya existe para evitar repetirla.

Formik administra el formulario y su estado de envío. `AuthField.tsx` conecta labels,
IDs, autocompletado y errores. `src/lib/auth-validation.ts` comprueba los campos en
el navegador; el backend vuelve a validarlos porque no debe confiar en el cliente.
Los estilos compartidos están en `src/components/auth/auth.module.css`.

## Llamadas al backend

Mantené cada sección junto a su página. Si después se usa en varias páginas, movela a `src/components/`. No hace falta crear un componente separado para cada título o párrafo.

`src/lib/api-client.ts` reúne la dirección del backend y una función `apiFetch` para las peticiones. Devuelve la respuesta de Fetch y lanza un error si el servidor responde con un estado de error. `reviews.service.ts` usa esa función y convierte la respuesta JSON en la lista de reseñas.

Las variables de entorno se documentan en `.env.example` y se configuran localmente en `.env.local`. Las que empiezan con `NEXT_PUBLIC_` son públicas: no deben guardar contraseñas ni claves privadas.
