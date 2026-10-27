import { prisma } from "../config/prisma.js";
import type { Sesion } from "./sesiones.entity.js";

export function crearSesion(
  usuarioId: string,
  expiraAt: Date,
): Promise<Sesion> {
  return prisma.sesion.create({
    data: {
      usuarioId,
      expiraAt,
    },
  });
}

export function buscarSesionPorId(id: string): Promise<Sesion | null> {
  return prisma.sesion.findUnique({
    where: { id },
  });
}

export function revocarSesion(
  id: string,
  usuarioId: string,
): Promise<{ count: number }> {
  return prisma.sesion.updateMany({
    where: {
      id,
      usuarioId,
      revocadaAt: null,
    },
    data: {
      revocadaAt: new Date(),
    },
  });
}
