# Consultas y propuestas

Las consultas del artista y del estudio usan los mismos registros de PostgreSQL. No se duplican por cuenta ni se inicializan desde los mocks del navegador. `ConsultasProvider` mantiene la bandeja compartida durante la navegación; se actualiza al recuperar la visibilidad, cada 30 segundos y mediante el botón Actualizar. Las otras pestañas del mismo navegador reciben un aviso de actualización sin datos personales. No sustituye a Socket.IO.

## Relaciones

- `Estudio.propietarioId` identifica al titular. `Usuario.estudioId` conserva el vínculo con un único estudio. Para artistas, `estadoEnEstudio` distingue activo y suspendido. Sin estudio, el artista trabaja de forma independiente.
- `Contacto` representa a quien consulta, sin exigir una cuenta. Pertenece a un estudio o a un artista independiente. Sus emails son únicos dentro de ese ámbito.
- `Solicitud` conserva respuestas del formulario, contacto, destino, canal de recepción, estado, cierre, artista asignado y versión. Se mantiene `clienteId` opcional para las solicitudes antiguas asociadas a usuarios registrados.
- `Cotizacion` pertenece a una solicitud y un artista. Es única para esa pareja y puede editarse mientras se reciben propuestas. Incluye importe, seña, detalle, vencimiento y boceto opcional. Los importes usan `Decimal(12,2)`.

Las claves foráneas compuestas impiden relacionar una solicitud con un contacto de otro negocio. Las comprobaciones SQL exigen un ámbito, un contacto o usuario y una seña coherente con el importe. Las tablas conservan RLS; el navegador accede exclusivamente a través del backend.

## Respuestas del formulario

La referencia funcional es el [formulario de Zen House Tattoo](https://www.zenhousetattoo.com/start). Los campos relevados antes del envío son:

| Pregunta                              | Datos                                                                                |
| ------------------------------------- | ------------------------------------------------------------------------------------ |
| Color o negro y gris                  | `tipoColor`                                                                          |
| Estilo                                | `estilo`                                                                             |
| Modelo corporal para ubicar el diseño | `generoCuerpo`, conservado por compatibilidad; no representa el género de la persona |
| Zona y subzona                        | `zonaGeneral`, `subZona`                                                             |
| Marcación de ubicación y tamaño       | `imagenZonaMarcada`, `tamano`                                                        |
| Idea del tatuaje                      | `descripcion`; la referencia pide entre 15 y 350 caracteres                          |
| Ejemplos visuales                     | `referencias`; la referencia admite hasta cuatro imágenes                            |
| Nombre, email y WhatsApp              | Campos del contacto                                                                  |

El formulario de referencia permite hasta tres marcas sobre el modelo corporal. La captura de ese marcado y el formulario público de InkManager aún no están implementados. Los ejemplos actuales representan respuestas ingresadas mediante el seed. No implican aceptación de términos por personas reales. No se envían formularios a Zen House.

## Permisos y estados

El ámbito se resuelve desde la sesión y la membresía guardada en la BD. El frontend no elige el estudio ni el autor de una propuesta.

- El titular ve todas las consultas y propuestas de su estudio. Puede cerrar, archivar, definir el vencimiento y asignar o reasignar a un integrante activo.
- Los artistas activos ven las consultas del estudio y únicamente el contenido de sus propias propuestas. No pueden cerrar ni asignar proyectos del estudio.
- Un artista suspendido conserva acceso a las consultas que tiene asignadas y no puede presentar propuestas.
- El independiente administra sus consultas y presenta su propia propuesta; no tiene acceso a otros negocios.

Al cerrar: cero propuestas disponibles dejan la consulta por asignar, una asigna automáticamente su artista y varias esperan la elección del cliente. Las propuestas vencidas o de artistas que ya no son integrantes activos no participan. El enlace público para elegir todavía no existe; el titular puede resolver la asignación desde el panel.

El backend procesa vencimientos por lotes al consultar la bandeja, sin depender del reloj del navegador. No existe aún un worker que los ejecute sin solicitudes a la API. Cada lote procesa hasta 200 registros. La bandeja obtiene las 200 solicitudes más recientes y agrega las solicitudes vinculadas a los turnos para conservar su contexto histórico. La validez de propuestas se guarda como instante UTC y la interfaz muestra su fecha.

Las escrituras bloquean la solicitud y comprueban su versión para impedir ediciones simultáneas inadvertidas. Una versión desactualizada devuelve 409. Los bocetos se comprimen en el cliente; el backend comprueba tamaño y firma de imagen antes de subirlos a Cloudinary. Si falla la escritura, se limpia la imagen nueva.

## API y estructura

| Método y ruta                       | Función                                                                               |
| ----------------------------------- | ------------------------------------------------------------------------------------- |
| `GET /api/consultas`                | Contexto autorizado, equipo, contactos, turnos y solicitudes con propuestas visibles. |
| `PUT /api/consultas/:id/cotizacion` | Crear o actualizar la propuesta del artista autenticado. Admite `imagen` multipart.   |
| `PATCH /api/consultas/:id`          | Acciones `CIERRE`, `CERRAR`, `ASIGNAR` y `ARCHIVAR`, con versión obligatoria.         |

`solicitudes/` y `cotizaciones/` contienen controller, service, repository, entity y validación. Los controllers manejan HTTP; los services aplican permisos y reglas; los repositories consultan Prisma. `ConsultationsWorkspace` reutiliza la presentación para ambos roles y recibe los datos de `ConsultasProvider` a través de `consultas.service.ts`.

Clientes y Equipo muestran los datos reales y enlazan a sus consultas y turnos mediante filtros de URL. El titular o el independiente pueden editar sus contactos y sus excepciones de correo. Las invitaciones y los cambios de membresía se gestionan desde Equipo, según [Equipo del estudio](equipo-estudio.md). La agenda persiste sus turnos y permite agendar desde una consulta asignada, como se describe en [Turnos y agenda](turnos.md). La persistencia de mensajes y de preferencias se describe en [Mensajes, recordatorios y administración](operacion-y-administracion.md).

Los cambios de esquema están en `prisma/changes/20261102_consultas_compartidas.sql` y `20261102_integridad_consultas.sql`. Conservan los registros anteriores. `seed-recorrido.ts` crea un estudio, dos artistas de ese estudio, tres independientes y diez solicitudes con contactos y propuestas. Solo modifica sus cuentas de prueba identificadas explícitamente. Los accesos se generan en una carpeta local ignorada por Git y no se imprimen en la consola.
