import { fechaLocal } from './panel-artista';
import { crearRecordatorios } from '../mocks/recordatorios';
import { crearSuscripcion } from '../mocks/suscripcion';
import type { DatosPanelArtista, ConsultaPanel } from '../types/panel-artista';
import type { DatosPanelEstudio } from '../types/panel-estudio';
import type { ConsultaGuardada } from '../types/consultas';

export function crearEstadoArtista(): DatosPanelArtista {
  return {
    version: 2,
    clientes: [],
    consultas: [],
    citas: [],
    conversaciones: [],
    notificaciones: [],
    estudio: null,
    invitacion: null,
    preferencias: { diasLaborales: [1, 2, 3, 4, 5], horaInicio: '09:00', horaFin: '18:00' },
    recordatorios: crearRecordatorios(),
    suscripcion: { ...crearSuscripcion(fechaLocal(new Date())), cobros: [] },
  };
}
export function crearEstadoEstudio(): DatosPanelEstudio {
  return {
    version: 1,
    perfil: {
      nombre: 'Mi estudio',
      email: '',
      telefono: '',
      ciudad: '',
      direccion: '',
      biografia: '',
    },
    equipo: [],
    clientes: [],
    consultas: [],
    citas: [],
    conversaciones: [],
    borradoresMensajes: {},
    plazoPropuestasHoras: 48,
    recordatorios: crearRecordatorios(),
    suscripcion: { ...crearSuscripcion(fechaLocal(new Date())), plan: 'ESTUDIO', cobros: [] },
  };
}
export function consultaParaResumen(c: ConsultaGuardada, usuarioId: string): ConsultaPanel {
  const propia = c.propuestas.find((p) => p.artistaId === usuarioId);
  return {
    ...c,
    estado:
      c.estado === 'ARCHIVADA'
        ? 'ARCHIVADA'
        : c.estado === 'ASIGNADA' || propia
          ? 'PRESUPUESTADA'
          : c.estado === 'ABIERTA'
            ? 'NUEVA'
            : 'EN_REVISION',
    ...(propia ? { presupuesto: propia } : {}),
  };
}
