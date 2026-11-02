import type { DatosPanelArtista } from '../types/panel-artista';
import { crearPanelEjemplo } from '../mocks/panel-artista';

export function recuperarPanel(entrada: unknown): DatosPanelArtista | null {
  if (!entrada || typeof entrada !== 'object') return null;
  const guardados = entrada as DatosPanelArtista;
  if (
    ![1, 2].includes(Number(guardados.version)) ||
    !['clientes', 'consultas', 'citas', 'conversaciones', 'notificaciones'].every((nombre) =>
      Array.isArray(guardados[nombre as keyof DatosPanelArtista]),
    ) ||
    !guardados.preferencias ||
    !Array.isArray(guardados.preferencias.diasLaborales)
  )
    return null;
  const iniciales = crearPanelEjemplo();
  return {
    ...guardados,
    version: 2,
    recordatorios: guardados.recordatorios || iniciales.recordatorios,
    suscripcion: guardados.suscripcion || iniciales.suscripcion,
    consultas: guardados.consultas.map((consulta) => ({
      ...consulta,
      canal:
        consulta.canal ||
        iniciales.consultas.find((item) => item.id === consulta.id)?.canal ||
        'WEB',
    })),
    conversaciones: guardados.conversaciones.map((chat) => ({
      ...chat,
      canal:
        chat.canal || iniciales.conversaciones.find((item) => item.id === chat.id)?.canal || 'WEB',
    })),
  };
}
