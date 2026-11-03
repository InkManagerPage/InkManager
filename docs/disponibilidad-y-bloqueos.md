# Disponibilidad y bloqueos

Cada artista tiene una disponibilidad por negocio: una para su actividad independiente y otra para cada estudio al que pertenezca. Cambiar de modalidad no copia horarios ni bloqueos ni permite consultar la configuración del negocio anterior desde el estudio actual.

## Horarios de atención

La sección **Disponibilidad** permite habilitar días de lunes a domingo y configurar hasta ocho rangos por día. Por ejemplo, 09:00–13:00 y 15:00–19:00. Los rangos no pueden superponerse. Se admiten rangos contiguos y cierre a medianoche; las jornadas nocturnas se separan en dos días.

La primera lectura devuelve `semana: null`: todavía no hay horarios configurados. El formulario propone una semana inicial, pero solo se guarda al confirmarla. No se importan las preferencias locales antiguas ni se crean reglas al consultar la API. Es necesario guardar horarios antes de crear o reprogramar turnos. Los turnos existentes se conservan y se pueden confirmar, completar o cancelar sin cambiar su horario.

Un cambio de horarios se rechaza con 409 cuando deja fuera de atención un turno pendiente o confirmado que todavía no terminó. Primero deben reprogramarse o cancelarse esos turnos. No se modifican automáticamente.

## Bloqueos

Un bloqueo tiene motivo, inicio y fin. Puede cubrir horas concretas o días completos. En días completos, la última fecha seleccionada está incluida. Las fechas y horas se interpretan en la zona horaria del negocio y se conservan como instantes UTC, respetando cambios estacionales de 23 o 25 horas.

No puede superponerse con otro bloqueo activo de esa disponibilidad ni con un turno pendiente o confirmado del artista. Los límites son contiguos: un turno puede terminar justo cuando empieza un bloqueo. Para bloquear un horario ocupado hay que resolver primero el turno. Quitar un bloqueo conserva su registro con `canceladoAt` y libera el período de acuerdo con los horarios semanales.

La agenda muestra los bloqueos y permite abrir Disponibilidad para gestionarlos. Los filtros de cliente, consulta o estado muestran únicamente los turnos correspondientes.

## Permisos y concurrencia

- El artista independiente administra su disponibilidad.
- El integrante activo administra solamente la suya.
- El titular administra la de los artistas de su estudio, incluidos los suspendidos.
- El suspendido conserva acceso de lectura a su disponibilidad.
- Un titular no puede gestionar la disponibilidad independiente ni la de otro estudio.

Los permisos se comprueban nuevamente dentro de la transacción. Cada escritura requiere la versión de la disponibilidad; una versión desactualizada responde 409. Una exclusión de PostgreSQL impide superponer bloqueos activos. Un bloqueo transaccional por artista coordina reservas, horarios y bloqueos: dos solicitudes simultáneas no pueden reservar y bloquear el mismo intervalo.

La cuenta y su negocio se leen junto con el bloqueo de la fila. Las comprobaciones reutilizan esa lectura dentro de la misma transacción. Las escrituras devuelven el registro confirmado y la nueva versión, y reutilizan los bloqueos ya leídos para construir la respuesta. El panel aplica esa respuesta directamente y muestra un indicador mientras guarda; si la BD rechaza el cambio, conserva el formulario y presenta el error.

La zona horaria puede cambiarla el titular del negocio. Una agenda configurada con turnos futuros pendientes o confirmados, o con bloqueos futuros activos, exige resolverlos antes del cambio. Cambiar la zona incrementa las versiones de disponibilidad para impedir guardar formularios anteriores.

## API y estructura

| Ruta                                                        | Función                                      |
| ----------------------------------------------------------- | -------------------------------------------- |
| `GET /api/disponibilidad/:artistaId`                        | Horarios, bloques activos, zona y permisos.  |
| `PUT /api/disponibilidad/:artistaId`                        | Guardar `{ semana, version }`.               |
| `POST /api/disponibilidad/:artistaId/bloqueos`              | Crear bloqueo con versión de disponibilidad. |
| `PATCH /api/disponibilidad/:artistaId/bloqueos/:bloqueoId`  | Editar un bloqueo propio de esa agenda.      |
| `DELETE /api/disponibilidad/:artistaId/bloqueos/:bloqueoId` | Quitar con `{ version }`.                    |

`semana` contiene siete objetos `{ dia, rangos }`, con días ISO de 1 a 7. Cada rango tiene `desde` y `hasta` en formato `HH:mm`; `hasta` también admite `24:00`. Un día cerrado tiene `rangos: []`.

Un bloqueo recibe `motivo`, `desdeFecha`, `hastaFecha`, `diaCompleto`, `version` y, para horas concretas, `desdeHora` y `hastaHora`. Las fechas usan `YYYY-MM-DD`. Las escrituras devuelven la disponibilidad completa actualizada. `GET /api/consultas` incluye `bloqueosAgenda` autorizados para la agenda del negocio.

`Back/src/disponibilidad/` y `Back/src/bloqueos-agenda/` separan controller, service, repository, entity y validación. `AvailabilityWorkspace`, `WeeklyHoursEditor` y `AvailabilityBlocks` son compartidos por ambos paneles; `useDisponibilidad` y su servicio gestionan las peticiones y actualizaciones. No se envían correos ni se publican horarios al cliente desde estos endpoints.

El modelo Prisma y `Back/prisma/changes/20261102_disponibilidad.sql` definen `DisponibilidadArtista` y `BloqueoAgenda`, sus relaciones, índices y restricciones. Ambas tablas tienen RLS habilitado y se acceden desde el backend. Para instalar el esquema sobre una BD que ya contiene usuarios, estudios y turnos: `npm run db:disponibilidad` y `npm run db:generate` desde `Back`.
