import type { Prisma } from "@prisma/client";
import { prisma } from "../config/prisma.js";
import { HttpError } from "../errors/http-error.js";
import { cuentaEquipo, type CuentaEquipo } from "./equipo.entity.js";

export function conTitular<T>(
  usuarioId: string,
  operacion: (
    tx: Prisma.TransactionClient,
    estudio: { id: string; nombre: string; zonaHoraria: string },
    cuenta: CuentaEquipo,
  ) => Promise<T>,
) {
  return prisma.$transaction(
    async (tx) => {
      await tx.$queryRaw`SELECT "id" FROM "Usuario" WHERE "id"=${usuarioId} FOR SHARE`;
      const cuenta = await tx.usuario.findUnique({
        where: { id: usuarioId },
        select: cuentaEquipo,
      });
      if (!cuenta || cuenta.rol !== "ESTUDIO_ADMIN" || !cuenta.estudioId)
        throw new HttpError(
          403,
          "Solo el titular puede administrar el equipo.",
        );
      const estudio = await tx.estudio.findFirst({
        where: { id: cuenta.estudioId, propietarioId: usuarioId },
        select: { id: true, nombre: true, zonaHoraria: true },
      });
      if (!estudio)
        throw new HttpError(
          403,
          "No tenés permisos para administrar este estudio.",
        );
      return operacion(tx, estudio, cuenta);
    },
    { timeout: 30000, maxWait: 10000 },
  );
}
export function conArtista<T>(
  usuarioId: string,
  operacion: (tx: Prisma.TransactionClient, cuenta: CuentaEquipo) => Promise<T>,
) {
  return prisma.$transaction(
    async (tx) => {
      await tx.$queryRaw`SELECT "id" FROM "Usuario" WHERE "id"=${usuarioId} FOR UPDATE`;
      const cuenta = await tx.usuario.findUnique({
        where: { id: usuarioId },
        select: cuentaEquipo,
      });
      if (!cuenta || cuenta.rol !== "ARTISTA")
        throw new HttpError(403, "Necesitás una cuenta de artista.");
      return operacion(tx, cuenta);
    },
    { timeout: 30000, maxWait: 10000 },
  );
}
export async function contarPendientes(
  tx: Prisma.TransactionClient,
  artistaId: string,
  estudioId: string | null,
) {
  const solicitud = estudioId
    ? { estudioId }
    : { artistaDestinoId: artistaId, estudioId: null };
  const [turnos, consultas] = await Promise.all([
    tx.cita.count({
      where: {
        artistaId,
        solicitud,
        estado: { in: ["PENDIENTE", "CONFIRMADA"] },
      },
    }),
    tx.solicitud.count({
      where: {
        ...solicitud,
        ...(estudioId ? { artistaAsignadoId: artistaId } : {}),
        estado: { notIn: ["ARCHIVADA", "CANCELADO"] },
      },
    }),
  ]);
  return { turnos, consultas };
}
