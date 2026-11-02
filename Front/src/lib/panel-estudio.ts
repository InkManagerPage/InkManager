import type {
  CitaEstudio,
  ConsultaEstudio,
  IntegranteEstudio,
  PropuestaEstudio,
} from '../types/panel-estudio';
import { erroresCita, fechaLocal, validarPresupuesto } from './panel-artista';

export const estadosConsultaEstudio = {
  ABIERTA: 'Recibiendo propuestas',
  POR_ASIGNAR: 'Por asignar',
  ELECCION_CLIENTE: 'Elección del cliente',
  ASIGNADA: 'Asignada',
  ARCHIVADA: 'Archivada',
};
export const estadosIntegrante = {
  ACTIVO: 'Activo',
  SUSPENDIDO: 'Suspendido',
  INVITADO: 'Invitado',
  ELIMINADO: 'Baja',
};
export function propuestasDisponibles(
  consulta: ConsultaEstudio,
  equipo: IntegranteEstudio[],
  ahora = new Date(),
) {
  return consulta.propuestas.filter(
    (p) =>
      equipo.some((a) => a.id === p.artistaId && a.estado === 'ACTIVO') &&
      p.validez >= fechaLocal(ahora),
  );
}
export function cerrarConsulta(
  consulta: ConsultaEstudio,
  equipo: IntegranteEstudio[],
  ahora = new Date(),
): ConsultaEstudio {
  if (consulta.estado !== 'ABIERTA') return consulta;
  const propuestas = propuestasDisponibles(consulta, equipo, ahora);
  return {
    ...consulta,
    cerradaEn: ahora.toISOString(),
    estado:
      propuestas.length === 1
        ? 'ASIGNADA'
        : propuestas.length > 1
          ? 'ELECCION_CLIENTE'
          : 'POR_ASIGNAR',
    artistaId: propuestas.length === 1 ? propuestas[0]!.artistaId : null,
    asignadaPor: propuestas.length === 1 ? 'UNICA_PROPUESTA' : null,
  };
}
export function cerrarVencidas(
  consultas: ConsultaEstudio[],
  equipo: IntegranteEstudio[],
  ahora = new Date(),
) {
  let cambio = false;
  const resultado = consultas.map((c) => {
    if (c.estado === 'ABIERTA' && c.cierre && new Date(c.cierre).getTime() <= ahora.getTime()) {
      cambio = true;
      return cerrarConsulta(c, equipo, ahora);
    }
    return c;
  });
  return cambio ? resultado : consultas;
}
export function asignarConsulta(
  consulta: ConsultaEstudio,
  artistaId: string,
  equipo: IntegranteEstudio[],
  por: 'ESTUDIO' | 'CLIENTE',
  ahora = new Date(),
): ConsultaEstudio {
  if (consulta.estado === 'ARCHIVADA') throw new Error('La consulta está archivada.');
  if (!equipo.some((a) => a.id === artistaId && a.estado === 'ACTIVO'))
    throw new Error('Elegí un artista activo del estudio.');
  if (
    por === 'CLIENTE' &&
    (consulta.estado !== 'ELECCION_CLIENTE' ||
      !propuestasDisponibles(consulta, equipo, ahora).some((p) => p.artistaId === artistaId))
  )
    throw new Error('Esta propuesta ya no está disponible para elegir.');
  return {
    ...consulta,
    artistaId,
    asignadaPor: por,
    estado: 'ASIGNADA',
    cerradaEn: consulta.cerradaEn || ahora.toISOString(),
  };
}
export function validarPropuesta(
  consulta: ConsultaEstudio,
  propuesta: PropuestaEstudio,
  equipo: IntegranteEstudio[],
  ahora = new Date(),
) {
  if (
    consulta.estado !== 'ABIERTA' ||
    (consulta.cierre && new Date(consulta.cierre).getTime() <= ahora.getTime())
  )
    return 'La recepción de propuestas está cerrada.';
  if (!equipo.some((a) => a.id === propuesta.artistaId && a.estado === 'ACTIVO'))
    return 'Solo los artistas activos pueden presentar propuestas.';
  return validarPresupuesto(propuesta);
}
export function erroresCitaEstudio(
  cita: Omit<CitaEstudio, 'id'>,
  citas: CitaEstudio[],
  equipo: IntegranteEstudio[],
  id?: string,
) {
  const errores: Partial<Record<keyof CitaEstudio, string>> = erroresCita(
    cita,
    citas.filter((c) => c.artistaId === cita.artistaId),
    id,
  );
  const existente = citas.find((c) => c.id === id);
  const artista = equipo.find((a) => a.id === cita.artistaId);
  if (!artista || (artista.estado !== 'ACTIVO' && existente?.artistaId !== artista.id))
    errores.artistaId = 'Elegí un artista activo.';
  return errores;
}
export function validarCambioIntegrante(
  id: string,
  estado: IntegranteEstudio['estado'],
  citas: CitaEstudio[],
  hoy = fechaLocal(new Date()),
  consultas: ConsultaEstudio[] = [],
) {
  if (
    estado === 'ELIMINADO' &&
    consultas.some((c) => c.artistaId === id && c.estado === 'ASIGNADA')
  )
    return 'Reasigná o archivá sus consultas antes de quitarlo del equipo.';
  if (
    estado === 'ELIMINADO' &&
    citas.some(
      (c) => c.artistaId === id && c.fecha >= hoy && ['PENDIENTE', 'CONFIRMADA'].includes(c.estado),
    )
  )
    return 'Reasigná o cancelá sus próximos turnos antes de quitarlo del equipo.';
  return '';
}
