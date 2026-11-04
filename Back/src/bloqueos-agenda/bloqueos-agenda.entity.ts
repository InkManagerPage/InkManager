import { DateTime } from "luxon";
import type { BloqueoAgenda } from "@prisma/client";
export function presentarBloqueo(b: BloqueoAgenda, zonaHoraria: string) {
  const inicio = DateTime.fromJSDate(b.inicioAt).setZone(zonaHoraria),
    fin = DateTime.fromJSDate(b.finAt).setZone(zonaHoraria);
  const diaCompleto =
    b.diaCompleto &&
    inicio.toFormat("HH:mm") === "00:00" &&
    fin.toFormat("HH:mm") === "00:00";
  return {
    id: b.id,
    motivo: b.motivo,
    inicioAt: b.inicioAt.toISOString(),
    finAt: b.finAt.toISOString(),
    diaCompleto,
    desdeFecha: inicio.toISODate()!,
    desdeHora: inicio.toFormat("HH:mm"),
    hastaFecha: (diaCompleto ? fin.minus({ days: 1 }) : fin).toISODate()!,
    hastaHora: fin.toFormat("HH:mm"),
  };
}
export interface DatosBloqueo {
  motivo: string;
  inicioAt: Date;
  finAt: Date;
  diaCompleto: boolean;
}
