import type { SuscripcionPanel } from '../types/suscripcion';
import { fechaLocal, leerFecha } from '../lib/panel-artista';

export function crearSuscripcion(hoy: string): SuscripcionPanel {
  const fecha = leerFecha(hoy);
  const periodo = (meses: number) =>
    fechaLocal(new Date(fecha.getFullYear(), fecha.getMonth() + meses, 1));
  return {
    plan: 'INDIVIDUAL',
    ciclo: 'MENSUAL',
    cicloProximo: null,
    estado: 'ACTIVA',
    inicioPeriodo: periodo(0),
    finPeriodo: periodo(1),
    cobros: [0, -1, -2].map((mes, indice) => ({
      id: `IM-${fecha.getFullYear()}-${String(fecha.getMonth() + 1).padStart(2, '0')}-${indice + 1}`,
      fecha: periodo(mes),
      importe: 12000,
      concepto: 'Plan Individual · mensual',
      estado: 'APROBADO',
    })),
  };
}
