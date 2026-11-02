import { prisma } from "../config/prisma.js";
import type { Prisma } from "@prisma/client";
import type { AmbitoConsultas } from "../solicitudes/solicitudes.entity.js";
import { detalleCita } from "./citas.entity.js";

export function filtroCitas(a: AmbitoConsultas): Prisma.CitaWhereInput {
  return {
    solicitud:
      a.tipo === "ESTUDIO"
        ? { estudioId: a.estudioId }
        : { artistaDestinoId: a.usuarioId, estudioId: null },
    ...(!a.administra || a.tipo === "INDEPENDIENTE"
      ? { artistaId: a.usuarioId }
      : {}),
  };
}
export function listarCitas(a: AmbitoConsultas) {
  return prisma.cita.findMany({
    where: filtroCitas(a),
    include: detalleCita,
    orderBy: { inicioAt: "asc" },
  });
}
export function buscarCita(a: AmbitoConsultas, id: string) {
  return prisma.cita.findFirst({
    where: { ...filtroCitas(a), id },
    include: detalleCita,
  });
}
export function buscarCruce(
  tx: Prisma.TransactionClient,
  artistaId: string,
  inicioAt: Date,
  finAt: Date,
  id?: string,
) {
  return tx.cita.findFirst({
    where: {
      artistaId,
      estado: { not: "CANCELADA" },
      inicioAt: { lt: finAt },
      finAt: { gt: inicioAt },
      ...(id ? { id: { not: id } } : {}),
    },
    select: { id: true },
  });
}
export function actualizarZonaHoraria(a: AmbitoConsultas, zonaHoraria: string) {
  return a.tipo === "ESTUDIO"
    ? prisma.estudio.updateMany({
        where: { id: a.estudioId!, propietarioId: a.usuarioId },
        data: { zonaHoraria },
      })
    : prisma.usuario.updateMany({
        where: { id: a.usuarioId, rol: "ARTISTA", estudioId: null },
        data: { zonaHoraria },
      });
}
