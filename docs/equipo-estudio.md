# Equipo del estudio

El titular administra el equipo desde `/estudio/equipo`. Los artistas consultan su pertenencia y responden invitaciones en `/artista/estudio`. Las cuentas conservan el rol `ARTISTA`; el vínculo `Usuario.estudioId` determina si trabajan de forma independiente o para un único estudio.

## Invitaciones

El titular invita por email. Una invitación tiene una vigencia de siete días y requiere aceptación explícita. No crea cuentas ni incorpora automáticamente a un artista. No puede dirigirse a una cuenta de cliente, titular o artista que ya pertenezca a un estudio.

El correo conduce a `/invitacion-equipo`, desde donde se puede ingresar o registrar una cuenta. Para ver y responder una invitación se necesita una cuenta de artista con el mismo email verificado. Un enlace compartido no permite aceptar una invitación ajena: el backend comprueba la identidad autenticada. El titular también necesita verificar su email antes de enviar invitaciones.

Cada pareja estudio/email puede tener una sola invitación pendiente. Es posible reenviarla después de un minuto o cancelarla mientras esté vigente. Reenviar renueva su vigencia. Las invitaciones aceptadas, rechazadas, canceladas y vencidas se conservan como historial; una vencida requiere una invitación nueva.

Las invitaciones del artista aparecen en Mi estudio y se anuncian en su Resumen. La pertenencia actual a un estudio impide aceptar otra invitación. Antes de incorporarse, el independiente debe resolver todos sus turnos pendientes o confirmados y archivar sus consultas independientes abiertas o asignadas. Archivar una consulta también requiere resolver sus turnos activos.

`InvitacionEquipo` guarda estudio, autor, destinatario, estado, vencimiento, aceptación, estado del correo y versión. La aceptación y el cambio de membresía se confirman en una misma transacción. El bloqueo de la cuenta evita aceptar simultáneamente invitaciones a dos estudios.

## Estados de integrantes

| Acción      | Resultado                                                                                                                                                                       |
| ----------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Suspender   | Conserva la membresía, las asignaciones y los turnos. El artista puede consultar sus proyectos asignados y agenda, pero no presentar propuestas ni modificar turnos.            |
| Habilitar   | Recupera la posibilidad de presentar propuestas y gestionar sus propios turnos.                                                                                                 |
| Desvincular | Quita la membresía y el acceso al estudio. Conserva la cuenta, el perfil, el portafolio y los registros históricos del estudio. El artista vuelve a la modalidad independiente. |

Desvincular exige resolver los turnos pendientes o confirmados y reasignar o archivar todas las consultas asignadas sin archivar. No cancela reservas ni elimina clientes automáticamente. El formulario muestra los pendientes y ofrece accesos a sus consultas y agenda. Las reglas se vuelven a comprobar en el backend, aunque la pantalla permita iniciar la acción.

El titular mantiene la gestión de turnos existentes de un artista suspendido, pero no puede crear o reprogramar reservas para él mientras esté suspendido. Puede cancelarlas y resolver las asignaciones. Las propuestas de integrantes suspendidos o desvinculados dejan de ser opciones válidas para asignar nuevos proyectos; su contenido permanece en el historial.

## Permisos y concurrencia

Solo el titular real del estudio puede invitar, reenviar, cancelar o cambiar integrantes. El rol por sí solo no alcanza: se comprueban también la propiedad y la membresía actuales. Los artistas no pueden administrar compañeros ni modificar integrantes de otro estudio.

`Usuario.versionEquipo` e `InvitacionEquipo.version` permiten detectar pantallas desactualizadas. Las versiones antiguas devuelven 409. Los bloqueos de filas coordinan la membresía con la presentación de propuestas, la asignación de proyectos y las reservas. Los permisos se calculan desde la BD en cada petición; no dependen de una bandera guardada en el navegador.

## API y módulos

| Ruta                                          | Función                                                            |
| --------------------------------------------- | ------------------------------------------------------------------ |
| `GET /api/consultas`                          | Incluye equipo, cantidad de pendientes e invitaciones autorizadas. |
| `POST /api/invitaciones-equipo`               | Crear una invitación con `{email}`.                                |
| `PATCH /api/invitaciones-equipo/:id`          | Acciones `REENVIAR` y `CANCELAR`, con `version`.                   |
| `POST /api/invitaciones-equipo/:id/respuesta` | Acciones `ACEPTAR` y `RECHAZAR`, con `version`.                    |
| `PATCH /api/equipo/:id`                       | Acciones `SUSPENDER`, `HABILITAR` y `DESVINCULAR`, con `version`.  |

`Back/src/equipo/` y `Back/src/invitaciones-equipo/` separan controller, service, repository, entity y validación. El esquema SQL complementario está en `Back/prisma/changes/20261102_equipo.sql`, con índice único parcial y RLS habilitado.

`TeamWorkspace` comparte la pantalla entre roles y `InvitationList` presenta invitaciones e historial. Las mutaciones pasan por `services/equipo.service.ts`; `ConsultasProvider` actualiza la fuente compartida y avisa a otras pestañas. El filtro del equipo y su búsqueda se conservan en la URL.

El envío reutiliza el [transporte de correo del proyecto](correos-y-recuperacion.md), que admite Resend o Brevo en producción. En desarrollo, `MAIL_TRANSPORT=preview` guarda el correo localmente. Si falla el envío, la invitación permanece guardada y el titular puede reenviarla. Los reenvíos usan una clave de idempotencia por invitación y versión, con un límite de solicitudes por cuenta.
