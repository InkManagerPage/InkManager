export type RecordatorioCliente = 'TURNO' | 'CUIDADOS' | 'RESENA';
export type RecordatorioArtista = 'AGENDA' | 'RESUMEN_SEMANAL' | 'RESUMEN_MENSUAL';
export type TipoRecordatorio = RecordatorioCliente | RecordatorioArtista;

export interface ReglaCorreo {
  activo: boolean;
  asunto: string;
  mensaje: string;
  horas: number;
  dias: number;
  hora: string;
  diaSemana: number;
  momentoAgenda: 'ANTERIOR' | 'MISMO_DIA';
}
export type ExcepcionesRecordatorios = Partial<Record<RecordatorioCliente, boolean>>;

export interface RecordatoriosPanel {
  clientesHabilitados: boolean;
  artistaHabilitado: boolean;
  zonaHoraria: string;
  reglas: Record<TipoRecordatorio, ReglaCorreo>;
}
