import type { ClientePanel } from './panel-artista';
import type { ConsultaEstudio } from './panel-estudio';
import type { IntegranteGuardado, InvitacionEquipo } from './equipo';
import type { CitaGuardada } from './citas';
import type { BloqueoAgenda } from './disponibilidad';
export interface ConsultaGuardada extends ConsultaEstudio {
  version: number;
  referencias: string[];
  imagenZonaMarcada: string | null;
  modeloCorporal: string;
  zonaGeneral: string;
}
export interface BandejaConsultas {
  contexto: {
    usuarioId: string;
    tipo: 'ESTUDIO' | 'INDEPENDIENTE';
    estudioId: string | null;
    nombre: string;
    administra: boolean;
    puedeProponer: boolean;
    zonaHoraria: string;
    email: string;
    emailVerificado: boolean;
  };
  clientes: ClientePanel[];
  equipo: IntegranteGuardado[];
  consultas: ConsultaGuardada[];
  citas: CitaGuardada[];
  invitaciones: InvitacionEquipo[];
  bloqueosAgenda: (BloqueoAgenda & { artistaId: string; artistaNombre: string })[];
}
