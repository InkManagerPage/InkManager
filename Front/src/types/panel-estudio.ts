import type { CitaPanel, ClientePanel, ConsultaPanel, ConversacionPanel } from './panel-artista';
import type { RecordatoriosPanel } from './recordatorios';
import type { SuscripcionPanel } from './suscripcion';

export type EstadoIntegrante = 'ACTIVO' | 'SUSPENDIDO' | 'INVITADO' | 'ELIMINADO';
export interface IntegranteEstudio {
  id: string;
  nombre: string;
  email: string;
  estilos: string;
  estado: EstadoIntegrante;
}
export interface PropuestaEstudio {
  id: string;
  artistaId: string;
  importe: number;
  sena: number;
  detalle: string;
  validez: string;
  boceto: string;
  fecha: string;
}
export type EstadoConsultaEstudio =
  'ABIERTA' | 'POR_ASIGNAR' | 'ELECCION_CLIENTE' | 'ASIGNADA' | 'ARCHIVADA';
export interface ConsultaEstudio extends Omit<ConsultaPanel, 'estado' | 'presupuesto'> {
  estado: EstadoConsultaEstudio;
  cierre: string | null;
  cerradaEn: string | null;
  artistaId: string | null;
  asignadaPor: 'ESTUDIO' | 'UNICA_PROPUESTA' | 'CLIENTE' | null;
  propuestas: PropuestaEstudio[];
}
export interface CitaEstudio extends CitaPanel {
  artistaId: string;
}
export interface PerfilEstudio {
  nombre: string;
  email: string;
  telefono: string;
  ciudad: string;
  direccion: string;
  biografia: string;
}
export interface DatosPanelEstudio {
  version: 1;
  perfil: PerfilEstudio;
  equipo: IntegranteEstudio[];
  clientes: ClientePanel[];
  consultas: ConsultaEstudio[];
  citas: CitaEstudio[];
  conversaciones: ConversacionPanel[];
  borradoresMensajes: Record<string, string>;
  plazoPropuestasHoras: number;
  recordatorios: RecordatoriosPanel;
  suscripcion: Omit<SuscripcionPanel, 'plan'> & { plan: 'ESTUDIO' };
}
