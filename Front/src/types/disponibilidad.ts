export interface RangoHorario {
  desde: string;
  hasta: string;
}
export interface DiaDisponible {
  dia: number;
  rangos: RangoHorario[];
}
export type SemanaDisponible = DiaDisponible[];
export interface BloqueoAgenda {
  id: string;
  motivo: string;
  inicioAt: string;
  finAt: string;
  diaCompleto: boolean;
  desdeFecha: string;
  desdeHora: string;
  hastaFecha: string;
  hastaHora: string;
}
export interface DisponibilidadAgenda {
  artista: { id: string; nombre: string };
  zonaHoraria: string;
  puedeEditar: boolean;
  version: number;
  semana: SemanaDisponible | null;
  bloqueos: BloqueoAgenda[];
}
export interface FormularioBloqueo {
  motivo: string;
  desdeFecha: string;
  desdeHora: string;
  hastaFecha: string;
  hastaHora: string;
  diaCompleto: boolean;
  version: number;
}
