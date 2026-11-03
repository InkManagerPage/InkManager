import type { RecordatoriosPanel, ReglaCorreo } from '../types/recordatorios';

const reglaBase: ReglaCorreo = {
  activo: true,
  asunto: '',
  mensaje: '',
  horas: 24,
  dias: 7,
  hora: '20:00',
  diaSemana: 0,
  momentoAgenda: 'ANTERIOR',
};

export function crearRecordatorios(): RecordatoriosPanel {
  return {
    clientesHabilitados: true,
    artistaHabilitado: true,
    zonaHoraria: 'America/Argentina/Buenos_Aires',
    reglas: {
      TURNO: {
        ...reglaBase,
        asunto: 'Recordatorio de tu turno con {{artista}}',
        mensaje:
          'Hola {{cliente}}, te esperamos el {{fecha}} a las {{hora}} para {{trabajo}}.\n\nSi necesitás reprogramar, comunicate con nosotros antes de tu turno.\n\n{{artista}}',
      },
      CUIDADOS: {
        ...reglaBase,
        horas: 2,
        asunto: 'Los cuidados de tu nuevo tatuaje',
        mensaje:
          'Hola {{cliente}}, gracias por tu sesión de hoy.\n\nRecordá seguir las indicaciones de cuidado que conversamos durante la sesión. Si te surge alguna duda, escribime para que podamos revisarla.\n\n{{artista}}',
      },
      RESENA: {
        ...reglaBase,
        asunto: '¿Cómo fue tu experiencia con {{artista}}?',
        mensaje:
          'Hola {{cliente}}, ¿cómo venís con tu tatuaje?\n\nMe gustaría conocer tu experiencia con la sesión de {{trabajo}}. Tu reseña ayuda a otras personas a elegir su próximo artista.\n\nGracias,\n{{artista}}',
      },
      AGENDA: {
        ...reglaBase,
        asunto: 'Tu agenda del {{fecha}}',
        mensaje:
          'Hola {{artista}}, estas son tus sesiones para el {{fecha}}:\n\n{{agenda}}\n\nQue tengas una buena jornada.',
      },
      RESUMEN_SEMANAL: {
        ...reglaBase,
        activo: false,
        hora: '20:00',
        diaSemana: 0,
        asunto: 'Tu semana en InkManager',
        mensaje:
          'Hola {{artista}}, este es el resumen de tu semana:\n\n{{resumen}}\n\nPodés consultar el detalle en tu panel.',
      },
      RESUMEN_MENSUAL: {
        ...reglaBase,
        activo: false,
        hora: '09:00',
        asunto: 'Tu resumen mensual de InkManager',
        mensaje:
          'Hola {{artista}}, así cerraste el mes:\n\n{{resumen}}\n\nEncontrá tus consultas, sesiones y clientes en el panel.',
      },
    },
  };
}
