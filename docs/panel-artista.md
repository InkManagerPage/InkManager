# Panel del artista

Los artistas ingresan al resumen de `/artista` después de iniciar sesión con contraseña o Google. Una sesión existente puede entrar mediante «Mi panel» en la cabecera. La API valida sesión y rol en todas las rutas privadas. El menú lateral se puede contraer en escritorio; en móvil se abre como un panel de Bootstrap con cierre y navegación por teclado.

## Vistas de gestión

| Ruta                      | Función                                                                                                    |
| ------------------------- | ---------------------------------------------------------------------------------------------------------- |
| `/artista`                | Resumen operativo de consultas pendientes, próximos turnos, confirmaciones y mensajes.                     |
| `/artista/estadisticas`   | Métricas mensuales de sesiones, importes realizados, clientes y canales de recepción.                      |
| `/artista/consultas`      | Búsqueda y filtros por estado, detalle con referencias, notas privadas y preparación de presupuestos.      |
| `/artista/agenda`         | Vistas semanal y de lista, creación y edición de sesiones, estados y control de superposición de horarios. |
| `/artista/clientes`       | Directorio de contactos reales y acceso a sus consultas.                                                   |
| `/artista/mensajes`       | Conversaciones, lectura y composición de mensajes de ejemplo.                                              |
| `/artista/estudio`        | Modalidad y equipo consultados desde la BD.                                                                |
| `/artista/notificaciones` | Avisos, filtros de lectura y acceso al detalle de cada actividad.                                          |
| `/artista/disponibilidad` | Días de atención, rangos horarios y bloqueos persistidos por negocio.                                      |
| `/artista/configuracion`  | Accesos a disponibilidad, contraseña y recordatorios.                                                      |
| `/artista/recordatorios`  | Reglas de correo para clientes y artista, horarios, contenido y excepciones.                               |
| `/artista/suscripcion`    | Plan, facturación, renovación e historial de pagos.                                                        |
| `/artista/trabajos`       | Portafolio conectado a la API: borradores, edición, publicación y eliminación.                             |
| `/artista/perfil`         | Perfil conectado a la API: foto, nombre artístico, biografía, ubicación y estilos.                         |

## Datos de gestión

Las consultas, propuestas, contactos, turnos, disponibilidad y pertenencia al estudio proceden del backend, compartidos mediante `ConsultasProvider`. La bandeja del artista y la del titular consultan los mismos registros. El panel consulta la operación del negocio mediante `useOperacion`. Las reglas, contactos y avisos se guardan en el backend. Los tokens de sesión se manejan con cookies.

El directorio permite editar los contactos y sus excepciones de correo. Mi estudio muestra el equipo y permite aceptar o rechazar invitaciones vinculadas al email verificado. El ingreso requiere resolver primero el trabajo independiente pendiente. Los contratos y permisos están en [Equipo del estudio](equipo-estudio.md). La agenda persiste los turnos y permite reservar desde una consulta asignada. El artista gestiona sus sesiones y el titular también puede gestionarlas si pertenecen al estudio. Mensajes, recordatorios y suscripción se describen en [Mensajes, recordatorios y administración](operacion-y-administracion.md). Véase [Turnos y agenda](turnos.md). El detalle de la integración está en [Consultas y propuestas](consultas-y-propuestas.md).

Los nombres completos de contactos admiten entre 2 y 80 caracteres, con letras, espacios, apóstrofes o guiones. Esta regla no modifica los nombres del registro de cuentas. La agenda valida fecha, hora, duración de 30 minutos a 8 horas, importes y seña. Las sesiones canceladas no bloquean horarios y dos sesiones consecutivas pueden compartir la hora de fin e inicio. Los presupuestos requieren importe positivo, seña menor o igual al total, detalle y fecha de validez desde hoy.

El perfil y los trabajos mantienen sus servicios y permisos reales. La interfaz de gestión no contiene controles de reinicio de los datos ni etiquetas temporales.

## Navegación y formularios

El menú agrupa Trabajo diario, Gestión y Perfil y cuenta; recuerda si está contraído. Resumen prioriza los turnos de hoy y el próximo encuentro. Sus indicadores abren los listados filtrados correspondientes. Los filtros, búsqueda, mes y detalles abiertos se conservan en los parámetros de la URL. La agenda ofrece lista por día como vista inicial en móvil y admite listas del mes completo desde Estadísticas. Consultas y Clientes muestran filas adaptadas al móvil.

Los formularios usan Formik y controles de React Bootstrap. La validación comienza al enviar y luego se actualiza mientras se corrigen los datos. Los errores se muestran junto al campo y el envío lleva el foco al primer error. El formulario de turno agrupa importes, notas y excepciones de correo en acordeones. El perfil permite guardar datos incompletos y los trabajos publicados indican si aún falta completar el perfil para aparecer en el catálogo.

La protección de cambios sin guardar utiliza nextjs-nav-guard en el layout raíz. Cerrar un formulario o navegar permite seguir editando o descartar. Recargar o cerrar la pestaña utiliza la confirmación propia del navegador. Los interruptores guardan la configuración en el backend. Las ediciones de texto requieren guardar. Los borradores de mensajes se mantienen en memoria por conversación.

## Estadísticas

La sección permite seleccionar un mes y consultar importes de sesiones realizadas, clientes atendidos, turnos por estado, consultas recibidas, horas realizadas e importe promedio por sesión. La evolución muestra seis meses hasta el seleccionado; la comparación usa el mes anterior completo, identificado como tal cuando el mes actual está en curso. La variación porcentual solo aparece para meses cerrados y cuando existe facturación anterior.

Para un integrante de estudio, las consultas atendidas y sus canales incluyen aquellas en las que presentó una propuesta o fue asignado. No se contabilizan como actividad personal todas las consultas disponibles del estudio. La agenda y los importes siempre corresponden al artista autenticado.

El importe realizado se muestra en ARS y suma las sesiones completadas según su fecha de agenda. No suma presupuestos, turnos pendientes o cancelados, ni duplica las señas incluidas en el importe. No representa cobros conciliados ni comprobantes fiscales. Los clientes atendidos son personas únicas con al menos una sesión completada en el mes; los recurrentes tienen además una sesión completada antes del mes seleccionado. Las tasas sin registros se muestran sin porcentaje.

`lib/estadisticas-artista.ts` concentra los cálculos sobre el estado del panel. Editar una sesión o consulta actualiza sus métricas al volver a esta sección. Estas estadísticas utilizan los turnos persistidos, según la zona horaria del negocio.

## Canal de recepción

Cada consulta y conversación conserva su `canal`: Instagram, WhatsApp, TikTok, Facebook o formulario web. Estadísticas cuenta los registros del mes seleccionado por ese campo. La asignación directa o mediante un estudio se mantiene por separado. No es una encuesta de atribución comercial ni se deduce el canal a partir de los mensajes escritos por la persona. Los conectores de cada canal son los que deben proporcionar ese dato cuando se integra la recepción real.

## Recordatorios

`types/recordatorios.ts` define reglas para turno, cuidados y reseña dirigidas al cliente, y agenda diaria, resumen semanal y mensual dirigidos al artista. Cada grupo tiene un control general de activación; cada regla admite activación individual, asunto y contenido. Las plantillas incluyen variables permitidas y una visualización del correo con las variables sustituidas como texto.

Los tiempos iniciales son 24 horas antes del turno, 2 horas después de completar la sesión para cuidados y 7 días después para reseña. La agenda diaria admite noche anterior o mismo día con hora editable; el resumen semanal permite elegir día y hora. El resumen mensual corresponde al mes cerrado y se configura para el primer día del siguiente. La zona horaria queda explícita en la configuración.

Las excepciones por sesión se editan en el formulario del turno y se guardan en la BD. Las excepciones del cliente se editan en su ficha. La preferencia del turno prevalece sobre la del cliente, y esta sobre la regla general. Desactivar el grupo de clientes impide todos esos correos. Un turno cancelado tampoco habilita recordatorios.

Las reglas generales se guardan en PostgreSQL. El programador de correos aplica las preferencias activadas cuando está habilitado en el backend.

## Suscripción

La vista muestra el plan, su estado, el ciclo, el próximo cobro y el período registrado. Permite iniciar la contratación o cancelar una suscripción vigente con confirmación.

## Mi perfil

El artista puede guardar foto, nombre artístico, biografía, ciudad y estilos principales. Se permite guardar un perfil incompleto. El nombre artístico admite entre 2 y 50 caracteres y la biografía hasta 300. La ubicación se elige por país, provincia o estado y ciudad; el backend valida el identificador de ciudad y obtiene sus nombres del catálogo. El formulario ocupa el área principal del panel. Un punto rojo junto a «Mi perfil» indica datos pendientes; al enfocarlo o pasar el cursor muestra los campos faltantes. El mismo formulario muestra una línea breve con esos campos.

`GET /api/artistas/perfil` devuelve los campos editables, `ciudadId`, `pais`, `provinciaId` y `perfilCompleto`, `totalPublicados` y `visibleEnCatalogo`. `PUT /api/artistas/perfil` recibe `nombreArtistico`, `biografia`, `ciudadId`, `estilosPrincipales` y el archivo opcional `imagen`. El backend obtiene la ciudad y el país a partir de `ciudadId`. El archivo reemplaza la foto anterior; omitirlo conserva la foto. El perfil no permite cambiar email, rol ni pertenencia a un estudio.

Las ciudades anteriores escritas libremente se conservan como referencia, pero se deben confirmar mediante el selector para completar el perfil. La migración `prisma/changes/20261027_ciudad_validada.sql` agrega `Usuario.ciudadId` sin reemplazar los textos existentes. El comportamiento del catálogo geográfico se describe en [Ubicaciones](ubicaciones.md).

## Mis trabajos

Cada trabajo pertenece a un usuario y contiene una sola foto, descripción, varios estilos y estado `BORRADOR` o `PUBLICADO`. Se almacena en `FotoGaleria`, junto con fechas de creación y actualización. La descripción admite hasta 1200 caracteres.

El artista puede crear y editar trabajos, filtrar su portafolio por estado, publicar, volver a borrador y eliminar con confirmación. Los borradores pueden estar incompletos. Publicar requiere foto, descripción y al menos un estilo. Publicar un trabajo no lo hace visible si el perfil sigue incompleto.

`POST /api/trabajos` y `PATCH /api/trabajos/:id` aceptan `descripcion`, `estilos`, `estado` y un archivo opcional `imagen`. En `PATCH`, los campos omitidos se conservan. Para cambiar solo el estado también se puede enviar JSON:

```json
{ "estado": "PUBLICADO" }
```

Las cargas utilizan `multipart/form-data`; los arreglos de estilos se envían como JSON dentro del campo correspondiente. El selector acepta originales JPG, PNG o WebP de hasta 10 MB para prepararlos en el navegador: limita el lado mayor a 1600 px, mantiene la proporción, elimina los metadatos al volver a codificar y ajusta la calidad JPEG buscando un archivo de hasta 1 MB. El máximo enviado es 2 MB; los botones de guardar permanecen desactivados durante el procesamiento. Si el resultado supera ese límite se rechaza. El backend también limita los archivos a 2 MB y comprueba su firma. Cloudinary aplica una transformación al ingresar, con dimensiones máximas de 1600×1600, calidad automática y formato WebP, antes de almacenar el archivo. Las imágenes existentes conservan sus archivos hasta que se reemplazan.

Reemplazar o eliminar una foto elimina su referencia anterior en Cloudinary. Si falla el guardado en la base después de una carga, el servicio intenta eliminar la imagen nueva.

## Lista común de estilos

`GET /api/estilos` devuelve el catálogo definido en `Back/src/estilos/estilos.entity.ts`. Perfil, trabajos y filtros de clientes utilizan esa misma lista. El backend rechaza estilos desconocidos y elimina duplicados de la selección. Los nombres no se escriben libremente desde el panel.

## Catálogo público

Un artista aparece cuando tiene foto, nombre artístico, biografía, ciudad, estilos principales y al menos un trabajo publicado completo. Los borradores y perfiles incompletos quedan fuera de `GET /api/catalogo`. Esta respuesta incluye `artistas`, `trabajos`, `estilos` y `ciudades`, sin email, contraseña, teléfono ni documentos personales.

La consulta devuelve hasta 100 artistas ordenados por nombre y hasta 24 trabajos publicados por artista, ordenados por fecha descendente. El frontend consulta sin caché y aplica los filtros existentes de estilo, ciudad y tipo. Un trabajo puede encontrarse por cualquiera de sus estilos.

En `/clientes` se muestra una única galería de trabajos publicados, con filtros por estilo, tipo de artista y ciudad. Cada foto abre un modal con la imagen completa, descripción, estilos, nombre, foto, biografía y ciudad del artista. No se muestran secciones separadas de artistas y estudios ni perfiles de ejemplo.

## Organización del código

- `Back/src/artistas/`: perfil propio, validaciones y persistencia.
- `Back/src/trabajos/`: portafolio, propiedad y estados de publicación.
- `Back/src/estilos/`: lista común y validación de selecciones.
- `Back/src/catalogo/`: selección y presentación de datos públicos.
- `Front/src/app/artista/`: rutas, navegación, formularios y galería.
- `Front/src/services/artistas.service.ts`: peticiones privadas del panel.
- `Front/src/services/catalogo.service.ts`: consulta pública del catálogo.
- `Front/src/types/artista.ts`: contratos del perfil, trabajos y catálogo.

El esquema está en `Back/prisma/schema.prisma`. El script SQL aditivo correspondiente es `Back/prisma/changes/20261026_panel_artista.sql`. Los trabajos existentes conservan sus fotos y pasan a borrador por defecto.

## Consultas como integrante de un estudio

**Disponibilidad** guarda los horarios y bloqueos del artista en su negocio actual. El integrante activo gestiona los suyos y el suspendido los consulta. La agenda y los formularios de reserva utilizan esas reglas; véase [Disponibilidad y bloqueos](disponibilidad-y-bloqueos.md).

La membresía se obtiene de la BD. Los integrantes activos ven las consultas del estudio y pueden editar su propia propuesta mientras estén abiertas. El titular ve todas las propuestas y administra el cierre y la asignación. El independiente usa la misma bandeja limitada a sus consultas. Los controles de cierre o asignación no se ofrecen a integrantes del estudio.
