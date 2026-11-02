import { DateTime } from "luxon";
import type { Prisma } from "@prisma/client";
import {
  detalleSolicitud,
  type AmbitoConsultas,
} from "../solicitudes/solicitudes.entity.js";

export const detalleCita = {
  solicitud: { include: detalleSolicitud },
  artista: { select: { id: true, nombre: true, nombreArtistico: true } },
} satisfies Prisma.CitaInclude;
export type CitaCompleta = Prisma.CitaGetPayload<{
  include: typeof detalleCita;
}>;
export interface DatosCita {
  solicitudId: string;
  titulo: string;
  inicioAt: Date;
  finAt: Date;
  importe: number;
  sena: number;
  estado: "PENDIENTE" | "CONFIRMADA" | "COMPLETADA" | "CANCELADA";
  notas: string;
  recordatorios: Record<string, boolean>;
}
export function presentarCita(c: CitaCompleta, a: AmbitoConsultas) {
  const inicio = DateTime.fromJSDate(c.inicioAt).setZone(a.zonaHoraria);
  return {
    id: c.id,
    solicitudId: c.solicitudId,
    clienteId: c.solicitud.contactoId || c.solicitud.clienteId || "",
    artistaId: c.artistaId,
    artistaNombre: c.artista.nombreArtistico || c.artista.nombre || "Artista",
    titulo: c.titulo,
    fecha: inicio.toISODate()!,
    hora: inicio.toFormat("HH:mm"),
    duracion: Math.round((c.finAt.getTime() - c.inicioAt.getTime()) / 60000),
    importe: Number(c.importe),
    sena: Number(c.sena),
    estado: c.estado,
    notas: c.notas,
    recordatorios: c.recordatorios,
    version: c.version,
    cotizacionId: c.cotizacionId,
    completadaAt: c.completadaAt?.toISOString() || null,
    canceladaAt: c.canceladaAt?.toISOString() || null,
    puedeEditar:
      (a.administra || (a.puedeProponer && c.artistaId === a.usuarioId)) &&
      !["COMPLETADA", "CANCELADA"].includes(c.estado),
  };
}
