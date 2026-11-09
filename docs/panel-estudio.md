# Panel del estudio

La ruta privada `/estudio` corresponde a la cuenta con rol `ESTUDIO_ADMIN`. El inicio de sesión con contraseña y el regreso desde Google dirigen a esa ruta. `/estudios` conserva la landing pública. La interfaz verifica la sesión antes de montar los datos del panel; el backend vuelve a validar el rol y el ámbito en las consultas y propuestas.

## Secciones

| Sección        | Función                                                                                      |
| -------------- | -------------------------------------------------------------------------------------------- |
| Resumen        | Turnos de hoy, consultas sin asignar, cierres próximos, equipo y canales de recepción.       |
| Agenda         | Turnos del equipo por día y artista, alta, edición, estado y excepciones de recordatorios.   |
| Disponibilidad | Días, rangos y bloqueos de cada integrante, con control de turnos afectados.                 |
| Consultas      | Estado del proyecto, propuestas, bocetos, cierre manual o por fecha y asignación de artista. |
| Clientes       | Directorio de contactos reales y acceso a sus consultas.                                     |
| Mensajes       | Bandeja por canal, conexión de Instagram y vínculos con consultas.                |
| Equipo         | Invitaciones, suspensión, habilitación, desvinculación y acceso a consultas y turnos.        |
| Estadísticas   | Mes y artista, importes de sesiones completadas, clientes únicos, horas, estados y canales.  |
| Recordatorios  | Reglas de correo para clientes y titular, tiempos, plantillas y zona horaria.                |
| Suscripción    | Ciclo mensual o anual, próxima renovación y cancelación.            |
| Perfil         | Nombre, descripción de hasta 300 caracteres, contacto y ubicación del estudio.               |
| Configuración  | Plazo predeterminado de propuestas para nuevas consultas.                                    |

## Consultas y propuestas

Los artistas activos pueden presentar una propuesta por consulta y actualizarla mientras la recepción esté abierta. Incluye importe, seña, detalle, validez y un boceto opcional. El artista vinculado accede a ese recorrido desde su sección Consultas; el independiente conserva la gestión individual.

Una consulta se cierra manualmente o al vencer su fecha. Las propuestas de integrantes no activos o cuya validez ya terminó se conservan como historial, pero no participan en la selección.

- Ninguna propuesta disponible: queda por asignar por el titular.
- Una propuesta disponible: se asigna su artista al cerrar.
- Varias propuestas disponibles: queda a elección del cliente.
- El titular puede asignar o reasignar directamente a un artista activo, incluso antes del cierre.

La elección pública del cliente requiere el enlace de acceso limitado que todavía no está publicado. El titular puede asignar directamente. El plazo se aplica en el backend al consultar la bandeja y mediante el programador cuando está activo.

## Equipo y agenda

**Disponibilidad** permite seleccionar un integrante y administrar sus días, rangos y bloqueos. Las reservas respetan esa configuración. Los cambios que afectan turnos activos se rechazan hasta resolverlos; véase [Disponibilidad y bloqueos](disponibilidad-y-bloqueos.md).

La pertenencia, las invitaciones y el estado de los artistas se gestionan en la BD. El titular puede invitar, suspender, habilitar y desvincular integrantes; el artista acepta o rechaza desde Mi estudio. Véase [Equipo del estudio](equipo-estudio.md). La agenda y las estadísticas usan turnos persistidos. El titular gestiona los del equipo y cada artista los suyos. Consultas, Clientes y Equipo enlazan a la agenda filtrada. Los permisos, estados y reglas de reserva se describen en [Turnos y agenda](turnos.md).

## Datos y componentes

`ConsultasProvider` consulta el contexto, los contactos, el equipo y las solicitudes de la API. `StudioProvider` combina esa fuente con la configuración, los mensajes y los avisos que devuelve la API de operación.

`components/panel/` contiene controles y formularios compartidos. `ConsultationsWorkspace` sirve a ambos roles y `WorkspaceDirectory` relaciona clientes e integrantes con sus consultas. Los contratos y reglas están descritos en [Consultas y propuestas](consultas-y-propuestas.md).

La bandeja, los recordatorios y las suscripciones se describen en [Mensajes, recordatorios y administración](operacion-y-administracion.md).
