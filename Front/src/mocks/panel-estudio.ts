import type { DatosPanelEstudio } from '../types/panel-estudio';
import { crearPanelEjemplo } from './panel-artista';
import { fechaLocal, moverFecha } from '../lib/panel-artista';

export function crearPanelEstudio(hoy = fechaLocal(new Date())): DatosPanelEstudio {
  const base = crearPanelEjemplo(hoy);
  return {
    version: 1,
    perfil: {
      nombre: 'Tinta Sur',
      email: 'equipo@tintasur.example.test',
      telefono: '+54 9 11 4826 3194',
      ciudad: 'Buenos Aires',
      direccion: 'Gorriti 4826, Palermo',
      biografia:
        'Un estudio de puertas abiertas, con artistas de estilos distintos y una misma forma de cuidar cada proyecto.',
    },
    equipo: [
      {
        id: 'artista-1',
        nombre: 'Lucía Fernández',
        email: 'lucia@example.test',
        estilos: 'Fine Line · Botánico',
        estado: 'ACTIVO',
      },
      {
        id: 'artista-2',
        nombre: 'Tomás Vidal',
        email: 'tomas@example.test',
        estilos: 'Blackwork · Geométrico',
        estado: 'ACTIVO',
      },
      {
        id: 'artista-3',
        nombre: 'Camila Vega',
        email: 'camila@example.test',
        estilos: 'Tradicional · Full Color',
        estado: 'ACTIVO',
      },
      {
        id: 'artista-4',
        nombre: 'Bruno Acosta',
        email: 'bruno@example.test',
        estilos: 'Realismo',
        estado: 'SUSPENDIDO',
      },
      {
        id: 'artista-5',
        nombre: 'Valentina Ríos',
        email: 'valentina@example.test',
        estilos: 'Ilustrativo',
        estado: 'INVITADO',
      },
    ],
    clientes: base.clientes,
    consultas: base.consultas.map((c, i) => ({
      ...c,
      presupuesto: undefined,
      origen: 'Estudio',
      estado:
        i === 2 ? 'POR_ASIGNAR' : i === 3 ? 'ELECCION_CLIENTE' : i === 4 ? 'ASIGNADA' : 'ABIERTA',
      cierre: i < 2 ? `${moverFecha(hoy, 2)}T18:00:00` : null,
      cerradaEn: [2, 3, 4].includes(i) ? `${hoy}T09:00:00` : null,
      artistaId: i === 4 ? 'artista-2' : null,
      asignadaPor: i === 4 ? 'ESTUDIO' : null,
      propuestas:
        i === 2 || i === 5
          ? []
          : (i === 0 ? ['artista-1'] : ['artista-2', 'artista-3']).map((artistaId, j) => ({
              id: `propuesta-${i}-${j}`,
              artistaId,
              importe: 138000 + i * 18000 + j * 25000,
              sena: 40000,
              detalle: j
                ? 'Diseño personalizado y una sesión de hasta tres horas. Incluye revisión del boceto.'
                : 'Diseño a medida y sesión de dos horas. Una revisión del diseño antes del turno.',
              validez: moverFecha(hoy, 14),
              boceto: '/images/tattoo-detail.jpg',
              fecha: `${hoy}T10:20:00`,
            })),
    })),
    citas: base.citas.map((c, i) => ({ ...c, artistaId: `artista-${(i % 3) + 1}` })),
    conversaciones: base.conversaciones,
    borradoresMensajes: {},
    plazoPropuestasHoras: 48,
    recordatorios: base.recordatorios,
    suscripcion: {
      ...base.suscripcion,
      plan: 'ESTUDIO',
      cobros: base.suscripcion.cobros.map((c) => ({
        ...c,
        importe: 35000,
        concepto: 'Plan Estudio · mensual',
      })),
    },
  };
}
