import type { IntegranteEstudio } from './panel-estudio';
export interface IntegranteGuardado extends IntegranteEstudio {
  version: number;
  turnosPendientes: number;
  consultasAsignadas: number;
}
export type AccionIntegrante = 'SUSPENDER' | 'HABILITAR' | 'DESVINCULAR';
export interface InvitacionEquipo {
  id: string;
  estudioId: string;
  estudioNombre: string;
  email: string;
  estado: 'PENDIENTE' | 'ACEPTADA' | 'RECHAZADA' | 'CANCELADA' | 'VENCIDA';
  expiraAt: string;
  createdAt: string;
  estadoEnvio: 'PENDIENTE' | 'ENVIADA' | 'ERROR';
  enviadaAt: string | null;
  version: number;
  puedeReenviar: boolean;
}
