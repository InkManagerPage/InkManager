import type { FormikErrors } from 'formik';
import { fechaLocal, leerFecha, erroresCita } from './panel-artista';
import type { BandejaConsultas } from '../types/consultas';
import type { CitaGuardada, FormularioCita } from '../types/citas';

export function relojEnZona(zonaHoraria: string, ahora = new Date()) {
  const partes = new Intl.DateTimeFormat('en-GB', {
    timeZone: zonaHoraria,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(ahora);
  const valor = (tipo: string) => partes.find((p) => p.type === tipo)!.value;
  return {
    fecha: `${valor('year')}-${valor('month')}-${valor('day')}`,
    hora: `${valor('hour')}:${valor('minute')}`,
  };
}
export function fechaValida(valor: string | null) {
  return Boolean(
    valor &&
    /^\d{4}-\d{2}-\d{2}$/.test(valor) &&
    !Number.isNaN(leerFecha(valor).getTime()) &&
    fechaLocal(leerFecha(valor)) === valor,
  );
}
export function crearFormularioCita(
  datos: BandejaConsultas,
  solicitudId: string,
  fecha: string,
  cita?: CitaGuardada,
): FormularioCita {
  if (cita)
    return {
      solicitudId: cita.solicitudId,
      titulo: cita.titulo,
      fecha: cita.fecha,
      hora: cita.hora,
      duracion: cita.duracion,
      importe: cita.importe,
      sena: cita.sena,
      estado: cita.estado,
      notas: cita.notas,
      recordatorios: cita.recordatorios || {},
      claveCreacion: crypto.randomUUID(),
      version: cita.version,
      versionConsulta: datos.consultas.find((c) => c.id === cita.solicitudId)?.version || 0,
      sesionAdicional: true,
    };
  const solicitud = datos.consultas.find((c) => c.id === solicitudId);
  const propuesta = solicitud?.propuestas.find((p) => p.artistaId === solicitud.artistaId);
  const anteriores = datos.citas.filter(
    (c) => c.solicitudId === solicitudId && c.estado !== 'CANCELADA',
  );
  return {
    solicitudId,
    titulo: solicitud?.titulo || '',
    fecha,
    hora: '10:00',
    duracion: 120,
    importe: anteriores.length ? 0 : propuesta?.importe || 0,
    sena: anteriores.length ? 0 : propuesta?.sena || 0,
    estado: 'PENDIENTE',
    notas: '',
    recordatorios: {},
    claveCreacion: crypto.randomUUID(),
    version: 0,
    versionConsulta: solicitud?.version || 0,
    sesionAdicional: anteriores.length > 0,
  };
}
export function erroresFormularioCita(v: FormularioCita, datos: BandejaConsultas, id?: string) {
  const solicitud = datos.consultas.find((c) => c.id === v.solicitudId);
  const errores: FormikErrors<FormularioCita> = {};
  if (!solicitud || solicitud.estado !== 'ASIGNADA' || !solicitud.artistaId)
    errores.solicitudId = 'Elegí una consulta con artista asignado.';
  else if (!datos.contexto.administra && solicitud.artistaId !== datos.contexto.usuarioId)
    errores.solicitudId = 'Solo podés agendar tus consultas asignadas.';
  const base = erroresCita(
    { ...v, clienteId: solicitud?.clienteId || '' },
    datos.citas.filter((c) => c.artistaId === solicitud?.artistaId),
    id,
  );
  for (const key of ['titulo', 'fecha', 'hora', 'duracion', 'importe', 'sena', 'notas'] as const)
    if (base[key]) errores[key] = base[key];
  for (const key of ['importe', 'sena'] as const)
    if (!/^\d+(\.\d{1,2})?$/.test(String(v[key]))) errores[key] = 'Usá hasta dos decimales.';
  if (v.estado === 'COMPLETADA') {
    const actual = datos.citas.find((c) => c.id === id);
    if (!actual || actual.estado !== 'CONFIRMADA')
      errores.estado = 'Confirmá el turno antes de completarlo.';
    const hoy = relojEnZona(datos.contexto.zonaHoraria);
    if (v.fecha + v.hora > hoy.fecha + hoy.hora) errores.estado = 'El turno todavía no comenzó.';
  }
  return errores;
}
