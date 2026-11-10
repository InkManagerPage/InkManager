import type { ExcepcionesRecordatorios, RecordatoriosPanel } from './recordatorios';
import type { SuscripcionPanel } from './suscripcion';

export type CanalConsulta = 'INSTAGRAM' | 'WHATSAPP' | 'TIKTOK' | 'FACEBOOK' | 'WEB';
export type EstadoConsulta = 'NUEVA' | 'EN_REVISION' | 'PRESUPUESTADA' | 'ARCHIVADA';
export type EstadoCita = 'PENDIENTE' | 'CONFIRMADA' | 'COMPLETADA' | 'CANCELADA';

export interface ClientePanel {
  id: string;
  nombre: string;
  email: string;
  telefono: string;
  ciudad: string;
  notas: string;
  recordatorios?: ExcepcionesRecordatorios;
  editable?: boolean;
}
export interface PresupuestoPanel {
  importe: number;
  sena: number;
  validez: string;
  detalle: string;
}
export interface ConsultaPanel {
  id: string;
  clienteId: string;
  titulo: string;
  descripcion: string;
  estilo: string;
  zona: string;
  tamano: string;
  color: string;
  origen: 'Directa' | 'Estudio';
  canal: CanalConsulta;
  fecha: string;
  estado: EstadoConsulta;
  notas: string;
  referencia: string;
  presupuesto?: PresupuestoPanel;
}
export interface CitaPanel {
  id: string;
  clienteId: string;
  titulo: string;
  fecha: string;
  hora: string;
  duracion: number;
  importe: number;
  sena: number;
  estado: EstadoCita;
  notas: string;
  recordatorios?: ExcepcionesRecordatorios;
}
export interface MensajePanel {
  id: string;
  texto: string;
  propio: boolean;
  fecha: string;
  estado?: 'RECIBIDO' | 'ENVIANDO' | 'ENVIADO' | 'ENTREGADO' | 'LEIDO' | 'ERROR' | 'INCIERTO';
}
export interface ConversacionPanel {
  puedeResponder?: boolean;
  id: string;
  clienteId: string;
  asunto: string;
  canal: CanalConsulta;
  sinLeer: number;
  mensajes: MensajePanel[];
  anterior?: string | null;
  nombre?: string;
  telefono?: string;
  ventanaHasta?: string;
  solicitudId?: string | null;
}
export interface PaginaMensajes {
  mensajes: MensajePanel[];
  anterior: string | null;
}
export interface NotificacionPanel {
  id: string;
  titulo: string;
  detalle: string;
  fecha: string;
  leida: boolean;
  destino: string;
}
export interface EstudioPanel {
  nombre: string;
  ciudad: string;
  direccion: string;
  email: string;
  integrantes: { nombre: string; especialidad: string; rol: string }[];
}
export interface PreferenciasPanel {
  diasLaborales: number[];
  horaInicio: string;
  horaFin: string;
}
export interface DatosPanelArtista {
  version: 2;
  clientes: ClientePanel[];
  consultas: ConsultaPanel[];
  citas: CitaPanel[];
  conversaciones: ConversacionPanel[];
  notificaciones: NotificacionPanel[];
  estudio: EstudioPanel | null;
  invitacion: EstudioPanel | null;
  preferencias: PreferenciasPanel;
  recordatorios: RecordatoriosPanel;
  suscripcion: SuscripcionPanel;
  borradoresMensajes?: Record<string, string>;
}
