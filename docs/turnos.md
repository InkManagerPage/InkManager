# Turnos y agenda

`Cita` representa una sesión de tatuaje. Pertenece a una `Solicitud`, al artista asignado y a la cuenta que la creó. El cliente y el negocio se obtienen de la solicitud; no se vuelven a cargar. La cotización del artista se conserva como referencia cuando existe.

## Recorrido

Desde una consulta asignada se abre **Agendar turno**, con cliente, artista, trabajo e importe de la propuesta precargados. La fecha, hora y duración se confirman manualmente. No se agenda automáticamente al asignar una consulta.

Una consulta puede tener varios turnos. **Agregar sesión** permite incorporarlos manualmente. El importe y la seña de las sesiones adicionales empiezan en cero, para no contabilizar otra vez el presupuesto completo. Cada sesión conserva su propio importe acordado. La seña forma parte del importe, no se suma como ingreso adicional ni acredita un pago.

Consultas, Clientes y Equipo enlazan a la agenda filtrada. Resumen muestra los turnos del día y Estadísticas calcula la actividad con los turnos persistidos. El importe realizado suma las sesiones completadas según su fecha de agenda; no representa una conciliación de cobros.

## Permisos

- El titular administra todos los turnos de su estudio.
- Cada artista activo del estudio administra exclusivamente sus turnos. No puede reservar ni modificar los de otro integrante.
- El independiente administra sus propias consultas y turnos.
- Los suspendidos conservan la lectura de su agenda. El titular puede cancelar un turno existente, pero no crear o reprogramar para un integrante suspendido.

El backend resuelve estos permisos desde la sesión y vuelve a comprobar la membresía dentro de la transacción. El artista y el cliente no se aceptan desde el formulario como autoridades de la reserva.

## Estados y horarios

Los estados son `PENDIENTE`, `CONFIRMADA`, `COMPLETADA` y `CANCELADA`. Un turno nuevo empieza por confirmar o confirmado. Solo se puede completar un turno confirmado que ya comenzó. Los completados y cancelados quedan cerrados para edición y conservan su historial.

La duración admitida es de 30 minutos a 8 horas, terminando dentro del mismo día o a medianoche. La zona horaria pertenece al estudio o al artista independiente, y puede cambiarla el titular de ese espacio. La BD conserva instantes UTC y todos los integrantes ven la misma hora del negocio. Los horarios inexistentes o repetidos por cambios estacionales se rechazan.

Los turnos de un mismo artista no pueden superponerse. La API comprueba el cruce y PostgreSQL lo garantiza con una restricción de exclusión, incluso para reservas simultáneas. Un turno puede comenzar cuando termina otro; artistas distintos pueden trabajar a la vez. Cancelar libera el horario. Los turnos completados conservan ocupado su intervalo histórico.

No se puede archivar o cambiar de artista una consulta que conserve turnos pendientes o confirmados. Primero deben resolverse o cancelarse.

## API y código

| Ruta                            | Función                                                                        |
| ------------------------------- | ------------------------------------------------------------------------------ |
| `GET /api/consultas`            | Bandeja autorizada con consultas, contactos, equipo, zona horaria y turnos.    |
| `POST /api/citas`               | Crear un turno de una consulta asignada.                                       |
| `PATCH /api/citas/:id`          | Editar, reprogramar, confirmar, completar o cancelar, con versión obligatoria. |
| `PATCH /api/citas/zona-horaria` | Cambiar la zona horaria del negocio.                                           |

La creación requiere `claveCreacion` UUID, `versionConsulta` y `sesionAdicional` para indicar una sesión adicional. Repetir la misma clave con el mismo contenido devuelve el turno existente; cambiar su contenido devuelve 409. Una edición con una versión antigua también devuelve 409.

`Back/src/citas/` separa controller, service, repository, entity y validación. `AgendaWorkspace` presenta la agenda de ambos roles; `citas.service.ts` comunica el frontend con la API y `ConsultasProvider` comparte las actualizaciones entre pantallas. La agenda ofrece día, semana y lista; en pantallas pequeñas la semana se presenta como una lista agrupada por día.

El esquema está definido en Prisma y en `Back/prisma/changes/20261102_turnos.sql`. `seed-turnos.ts` agrega proyectos y sesiones exclusivamente a las cuentas del recorrido de desarrollo; no reemplaza registros existentes. Los turnos locales antiguos no se importan automáticamente.

Las excepciones de recordatorios de cada turno se guardan en la BD. Las reglas generales del panel siguen siendo locales y todavía no existe un programador de envíos para las sesiones. Esta agenda no envía correos, mensajes ni genera cobros.
