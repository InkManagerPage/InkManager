import type { CitaEstudio } from './panel-estudio';
import type { ExcepcionesRecordatorios } from './recordatorios';
export interface CitaGuardada extends CitaEstudio {
  solicitudId: string;
  artistaNombre: string;
  version: number;
  cotizacionId: string | null;
  completadaAt: string | null;
  canceladaAt: string | null;
  puedeEditar: boolean;
}
export interface FormularioCita {
  solicitudId: string;
  titulo: string;
  fecha: string;
  hora: string;
  duracion: number;
  importe: number;
  sena: number;
  estado: CitaGuardada['estado'];
  notas: string;
  recordatorios: ExcepcionesRecordatorios;
  claveCreacion: string;
  version: number;
  versionConsulta: number;
  sesionAdicional: boolean;
}
