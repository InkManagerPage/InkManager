import type { DatosPanelArtista } from '../types/panel-artista';
import type {
  RecordatorioCliente,
  RecordatoriosPanel,
  ReglaCorreo,
  TipoRecordatorio,
} from '../types/recordatorios';

export const recordatoriosCliente: {
  id: RecordatorioCliente;
  titulo: string;
  descripcion: string;
}[] = [
  {
    id: 'TURNO',
    titulo: 'Recordatorio de turno',
    descripcion: 'Fecha, hora y trabajo de la próxima sesión.',
  },
  {
    id: 'CUIDADOS',
    titulo: 'Cuidados del tatuaje',
    descripcion: 'Indicaciones de cuidado después de completar la sesión.',
  },
  {
    id: 'RESENA',
    titulo: 'Pedido de reseña',
    descripcion: 'Una invitación a compartir su experiencia después de la sesión.',
  },
];
export const recordatoriosArtista: { id: TipoRecordatorio; titulo: string; descripcion: string }[] =
  [
    {
      id: 'AGENDA',
      titulo: 'Mi agenda diaria',
      descripcion: 'Un correo con las sesiones y horarios de tu jornada.',
    },
    {
      id: 'RESUMEN_SEMANAL',
      titulo: 'Resumen semanal',
      descripcion: 'Consultas, presupuestos y sesiones de la semana.',
    },
    {
      id: 'RESUMEN_MENSUAL',
      titulo: 'Resumen mensual',
      descripcion: 'Un balance del mes anterior, el primer día de cada mes.',
    },
  ];
export const diasSemana = [
  'domingo',
  'lunes',
  'martes',
  'miércoles',
  'jueves',
  'viernes',
  'sábado',
];
export const variablesCliente = ['cliente', 'artista', 'fecha', 'hora', 'trabajo'];
export function variablesCorreo(tipo: TipoRecordatorio) {
  return ['TURNO', 'CUIDADOS', 'RESENA'].includes(tipo)
    ? variablesCliente
    : tipo === 'AGENDA'
      ? ['artista', 'fecha', 'agenda']
      : ['artista', 'resumen'];
}
export function describirRegla(tipo: TipoRecordatorio, regla: ReglaCorreo) {
  if (tipo === 'TURNO') return `${regla.horas} h antes del turno`;
  if (tipo === 'CUIDADOS') return `${regla.horas} h después de completar la sesión`;
  if (tipo === 'RESENA')
    return `${regla.dias} ${regla.dias === 1 ? 'día' : 'días'} después de completar la sesión`;
  if (tipo === 'AGENDA')
    return `${regla.momentoAgenda === 'ANTERIOR' ? 'La noche anterior' : 'El mismo día'} a las ${regla.hora}`;
  if (tipo === 'RESUMEN_SEMANAL') return `Cada ${diasSemana[regla.diaSemana]} a las ${regla.hora}`;
  return `El día 1 de cada mes a las ${regla.hora}`;
}
export function validarReglaCorreo(tipo: TipoRecordatorio, regla: ReglaCorreo): string {
  return Object.values(erroresReglaCorreo(tipo, regla))[0] || '';
}
export function erroresReglaCorreo(tipo: TipoRecordatorio, regla: ReglaCorreo) {
  const errores: Partial<Record<keyof ReglaCorreo, string>> = {};
  if (tipo === 'AGENDA' && !['ANTERIOR', 'MISMO_DIA'].includes(regla.momentoAgenda))
    errores.momentoAgenda = 'Elegí cuándo recibir tu agenda.';
  if (regla.asunto.trim().length < 3 || regla.asunto.trim().length > 120)
    errores.asunto = 'El asunto debe tener entre 3 y 120 caracteres.';
  if (regla.mensaje.trim().length < 10 || regla.mensaje.trim().length > 3000)
    errores.mensaje = 'El correo debe tener entre 10 y 3000 caracteres.';
  const variables = [...`${regla.asunto} ${regla.mensaje}`.matchAll(/\{\{\s*([^}]+)\s*\}\}/g)].map(
    (coincidencia) => coincidencia[1]!.trim(),
  );
  if (variables.some((variable) => !variablesCorreo(tipo).includes(variable)))
    errores.mensaje = 'Revisá las variables: usá las que aparecen debajo del mensaje.';
  if (
    ['TURNO', 'CUIDADOS'].includes(tipo) &&
    (!Number.isInteger(regla.horas) ||
      regla.horas < (tipo === 'TURNO' ? 1 : 0) ||
      regla.horas > 168)
  )
    errores.horas = 'Elegí un plazo válido, de hasta 168 horas.';
  if (tipo === 'RESENA' && (!Number.isInteger(regla.dias) || regla.dias < 1 || regla.dias > 30))
    errores.dias = 'El plazo para pedir reseña debe ser de 1 a 30 días.';
  if (
    ['AGENDA', 'RESUMEN_SEMANAL', 'RESUMEN_MENSUAL'].includes(tipo) &&
    !/^([01]\d|2[0-3]):[0-5]\d$/.test(regla.hora)
  )
    errores.hora = 'Elegí un horario válido.';
  if (
    tipo === 'RESUMEN_SEMANAL' &&
    (!Number.isInteger(regla.diaSemana) || regla.diaSemana < 0 || regla.diaSemana > 6)
  )
    errores.diaSemana = 'Elegí un día de la semana.';
  return errores;
}
export function validarRecordatorios(configuracion: RecordatoriosPanel): string {
  try {
    new Intl.DateTimeFormat('es', { timeZone: configuracion.zonaHoraria });
  } catch {
    return 'Elegí una zona horaria válida.';
  }
  for (const { id } of [...recordatoriosCliente, ...recordatoriosArtista]) {
    const regla = configuracion.reglas[id];
    if (!regla) return 'Falta configurar uno de los recordatorios.';
    const error = validarReglaCorreo(id, regla);
    if (error) return error;
  }
  return '';
}
export function reemplazarVariables(texto: string, valores: Record<string, string>) {
  return texto.replace(
    /\{\{\s*([^}]+)\s*\}\}/g,
    (original, clave: string) => valores[clave.trim()] ?? original,
  );
}
export function recordatorioHabilitado(
  datos: Pick<DatosPanelArtista, 'recordatorios' | 'clientes' | 'citas'>,
  clienteId: string,
  tipo: RecordatorioCliente,
  citaId?: string,
): boolean {
  if (!datos.recordatorios.clientesHabilitados) return false;
  const cliente = datos.clientes.find((item) => item.id === clienteId);
  if (!cliente) return false;
  const cita = datos.citas.find((item) => item.id === citaId && item.clienteId === clienteId);
  if (cita?.estado === 'CANCELADA') return false;
  return (
    cita?.recordatorios?.[tipo] ??
    cliente?.recordatorios?.[tipo] ??
    datos.recordatorios.reglas[tipo].activo
  );
}

export function motivoRecordatorio(
  datos: Pick<DatosPanelArtista, 'recordatorios' | 'clientes' | 'citas'>,
  clienteId: string,
  tipo: RecordatorioCliente,
  excepciones: Partial<Record<RecordatorioCliente, boolean>> = {},
  porTurno = false,
): string {
  if (!datos.recordatorios.clientesHabilitados)
    return 'No se enviará: correos para clientes desactivados.';
  const cliente = datos.clientes.find((item) => item.id === clienteId);
  const activo =
    excepciones[tipo] ??
    (porTurno ? cliente?.recordatorios?.[tipo] : undefined) ??
    datos.recordatorios.reglas[tipo].activo;
  if (excepciones[tipo] !== undefined)
    return activo
      ? 'Activado para esta ' + (porTurno ? 'sesión.' : 'persona.')
      : 'No se enviará: excepción ' + (porTurno ? 'del turno.' : 'del cliente.');
  if (porTurno && cliente?.recordatorios?.[tipo] !== undefined)
    return activo
      ? 'Activado según las preferencias del cliente.'
      : 'No se enviará: preferencia del cliente.';
  return activo ? 'Activado según la regla general.' : 'No se enviará: regla general desactivada.';
}
