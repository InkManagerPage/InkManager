export interface DatosCotizacion {
  importe: number;
  sena: number;
  detalle: string;
  validez: Date;
  duracionMinutos?: number;
  version: number;
}
