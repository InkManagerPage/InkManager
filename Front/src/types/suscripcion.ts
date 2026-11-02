export type CicloPlan = 'MENSUAL' | 'ANUAL';

export interface CobroPanel {
  id: string;
  fecha: string;
  importe: number;
  concepto: string;
  estado: 'APROBADO' | 'PENDIENTE' | 'RECHAZADO';
}
export interface SuscripcionPanel {
  plan: 'INDIVIDUAL';
  ciclo: CicloPlan;
  cicloProximo: CicloPlan | null;
  estado: 'ACTIVA' | 'CANCELACION_PROGRAMADA';
  inicioPeriodo: string;
  finPeriodo: string;
  cobros: CobroPanel[];
}
